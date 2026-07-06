package com.wbm.feeder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wbm.feeder.model.*;
import com.wbm.feeder.repository.*;
import com.wbm.feeder.service.DeviceEventPublisher;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MqttIngestionService {

    private static final Logger log = LoggerFactory.getLogger(MqttIngestionService.class);
    private static final Pattern TOPIC_STATUS = Pattern.compile("^devices/(.+)/status$");
    private static final Pattern TOPIC_CMD    = Pattern.compile("^devices/(.+)/cmd$");
    private static final DateTimeFormatter DEVICE_TS_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final Map<Integer, String> ERROR_LABELS = Map.of(
        1,  "Motor desconectado ou fusível queimado.",
        2,  "Motor travado por objeto estranho ou ração úmida.",
        3,  "Alimentador vazio.",
        4,  "Tensão baixa — verifique a alimentação elétrica.",
        6,  "Alerta de nível de ração baixo — abasteça assim que possível.",
        11, "Motor ligado por tempo excessivo sem atingir o peso."
    );

    @Value("${mqtt.broker-url}")
    private String brokerUrl;

    @Value("${mqtt.username:}")
    private String mqttUsername;

    @Value("${mqtt.password:}")
    private String mqttPassword;

    private final FeedHistoryService        feedHistoryService;
    private final DeviceTelemetryRepository telemetryRepo;
    private final DeviceScheduleRepository  scheduleRepo;
    private final ErrorLogRepository        errorLogRepo;
    private final DeviceLastSeenRepository  lastSeenRepo;
    private final DeviceEventPublisher      eventPublisher;
    private final ObjectMapper              mapper = new ObjectMapper();

    private MqttClient client;
    private final ScheduledExecutorService mqttScheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "mqtt-connector");
                t.setDaemon(true);
                return t;
            });

    private final Map<String, Boolean> prevAl  = new ConcurrentHashMap<>();
    private final Map<String, Integer> prevErr = new ConcurrentHashMap<>();
    // Store schedule payload from the device status for grams lookup
    private final Map<String, JsonNode> lastCpt   = new ConcurrentHashMap<>();
    private final Map<String, JsonNode> lastCps   = new ConcurrentHashMap<>();
    private final Map<String, Integer>  lastPf    = new ConcurrentHashMap<>();
    // Device local time at feed start (al: false → true)
    private final Map<String, String>   feedStartTs      = new ConcurrentHashMap<>();
    // Epoch ms when feed started — used to compare against manual cmd timestamp
    private final Map<String, Long>     feedStartEpochMs = new ConcurrentHashMap<>();
    // Pending manual feed from cmd topic (sim field)
    private final Map<String, Integer>  pendingManualGrams = new ConcurrentHashMap<>();
    private final Map<String, Long>     pendingManualCmdAt  = new ConcurrentHashMap<>();

    public MqttIngestionService(FeedHistoryService feedHistoryService,
                                DeviceTelemetryRepository telemetryRepo,
                                DeviceScheduleRepository scheduleRepo,
                                ErrorLogRepository errorLogRepo,
                                DeviceLastSeenRepository lastSeenRepo,
                                DeviceEventPublisher eventPublisher) {
        this.feedHistoryService = feedHistoryService;
        this.telemetryRepo      = telemetryRepo;
        this.scheduleRepo       = scheduleRepo;
        this.errorLogRepo       = errorLogRepo;
        this.lastSeenRepo       = lastSeenRepo;
        this.eventPublisher     = eventPublisher;
    }

    @PostConstruct
    public void startMqtt() {
        mqttScheduler.execute(this::tryConnect);
    }

    @PreDestroy
    public void stopMqtt() {
        mqttScheduler.shutdownNow();
        if (client != null) {
            try { client.close(); } catch (MqttException ignored) {}
        }
    }

    private synchronized void tryConnect() {
        try {
            if (client != null) {
                try { client.close(); } catch (MqttException ignored) {}
            }
            client = new MqttClient(brokerUrl, "feeder-backend-" + System.currentTimeMillis());
            MqttConnectOptions opts = new MqttConnectOptions();
            opts.setCleanSession(true);
            opts.setConnectionTimeout(15);
            opts.setKeepAliveInterval(20);
            opts.setAutomaticReconnect(false);
            if (mqttUsername != null && !mqttUsername.isBlank()) {
                opts.setUserName(mqttUsername);
                opts.setPassword(mqttPassword.toCharArray());
            }

            client.setCallback(new MqttCallback() {
                @Override public void connectionLost(Throwable cause) {
                    log.warn("MQTT connection lost: {} — reconnecting in 10s", cause.getMessage());
                    mqttScheduler.schedule(() -> tryConnect(), 10, TimeUnit.SECONDS);
                }
                @Override public void messageArrived(String topic, MqttMessage message) {
                    handleMessage(topic, message.getPayload());
                }
                @Override public void deliveryComplete(IMqttDeliveryToken token) {}
            });

            client.connect(opts);
            client.subscribe("devices/+/status", 1);
            client.subscribe("devices/+/cmd", 1);
            log.info("MQTT connected to {}", brokerUrl);
        } catch (MqttException e) {
            log.warn("MQTT connection failed: {} — retrying in 15s", e.getMessage());
            mqttScheduler.schedule(() -> tryConnect(), 15, TimeUnit.SECONDS);
        }
    }

    private void handleMessage(String topic, byte[] payload) {
        Matcher mc = TOPIC_CMD.matcher(topic);
        if (mc.matches()) {
            try {
                String cmdDeviceId = mc.group(1);
                JsonNode cmd = mapper.readTree(payload);
                eventPublisher.publishEvent("cmd", mapper.writeValueAsString(Map.of(
                        "deviceId", cmdDeviceId,
                        "timestamp", Instant.now().toString(),
                        "payload", mapper.convertValue(cmd, Map.class)
                )));
                if (cmd.has("sim") && cmd.get("sim").isNumber()) {
                    int simGrams = cmd.get("sim").intValue();
                    if (simGrams > 0) {
                        pendingManualGrams.put(cmdDeviceId, simGrams);
                        pendingManualCmdAt.put(cmdDeviceId, System.currentTimeMillis());
                        log.debug("Manual feed cmd: device={} grams={}", cmdDeviceId, simGrams);
                    }
                }
            } catch (Exception ignored) {}
            return;
        }

        Matcher m = TOPIC_STATUS.matcher(topic);
        if (!m.matches()) return;
        String deviceId = m.group(1);

        try {
            JsonNode d = mapper.readTree(payload);
            Instant now = Instant.now();

            Double  eg = nodeDouble(d, "eg");
            Double  ep = nodeDouble(d, "ep");
            Double  cp = nodeDouble(d, "cp");
            Double  tp = nodeDouble(d, "tp");
            Integer er = nodeInt(d, "er");
            Boolean al = nodeBool(d, "al");
            Integer pf = nodeInt(d, "pf");
            String  ts = d.has("ts") ? d.get("ts").asText() : null;

            telemetryRepo.save(new DeviceTelemetry(deviceId, now, eg, ep, cp, tp, er, al, nodeBoolean(d, "am"), pf));

            // Upsert last_seen — uma linha por dispositivo, sempre atualizada
            lastSeenRepo.findById(deviceId).ifPresentOrElse(
                ls -> { ls.setLastSeen(now); lastSeenRepo.save(ls); },
                ()  -> lastSeenRepo.save(new com.wbm.feeder.model.DeviceLastSeen(deviceId, now))
            );

            // Update cached schedule and profile
            if (pf != null) lastPf.put(deviceId, pf);
            if (d.has("c_pt") && d.get("c_pt").isArray())  lastCpt.put(deviceId, d.get("c_pt"));
            if (d.has("c_ps") && d.get("c_ps").isObject()) lastCps.put(deviceId, d.get("c_ps"));

            Boolean wasFed = prevAl.get(deviceId);

            // Feed started (al: false → true)
            if (Boolean.TRUE.equals(al) && !Boolean.TRUE.equals(wasFed)) {
                feedStartEpochMs.put(deviceId, System.currentTimeMillis());
                if (ts != null) feedStartTs.put(deviceId, ts);
            }

            // Feed ended (al: true → false) — save history in the backend so it works even sem browser aberto
            if (Boolean.FALSE.equals(al) && Boolean.TRUE.equals(wasFed)) {
                long nowMs = System.currentTimeMillis();
                Integer manGrams = pendingManualGrams.get(deviceId);
                Long cmdAt       = pendingManualCmdAt.get(deviceId);
                long motorStart  = feedStartEpochMs.getOrDefault(deviceId, 0L);

                // Manual se: há um sim pendente dentro do cooldown de 30 min e o motor ligou depois do cmd
                boolean isManual = manGrams != null && manGrams > 0
                        && cmdAt != null && (nowMs - cmdAt) < 30 * 60_000L
                        && motorStart > cmdAt;

                int grams;
                String source;
                if (isManual) {
                    grams  = manGrams;
                    source = "manual";
                    pendingManualGrams.remove(deviceId);
                    pendingManualCmdAt.remove(deviceId);
                } else {
                    grams  = resolveScheduledGrams(deviceId);
                    source = "scheduled";
                }

                if (grams > 0) {
                    feedHistoryService.saveIfNew(deviceId, grams, source);
                }

                feedStartTs.remove(deviceId);
                feedStartEpochMs.remove(deviceId);
            }

            if (al != null) prevAl.put(deviceId, al);

            // Publish live status to frontend via SSE
            try {
                var statusPayload = new java.util.HashMap<String, Object>();
                statusPayload.put("deviceId", deviceId);
                statusPayload.put("timestamp", now.toString());
                statusPayload.put("eg", eg);
                statusPayload.put("ep", ep);
                statusPayload.put("cp", cp);
                statusPayload.put("tp", tp);
                statusPayload.put("er", er);
                statusPayload.put("al", al);
                statusPayload.put("am", nodeBoolean(d, "am"));
                statusPayload.put("pf", pf);
                statusPayload.put("ts", ts);
                eventPublisher.publishStatus(mapper.writeValueAsString(statusPayload));
            } catch (Exception e) {
                log.warn("Failed to serialize status event for {}: {}", deviceId, e.getMessage());
            }

            // Log new errors only
            if (er != null && er > 0) {
                Integer last = prevErr.get(deviceId);
                if (!er.equals(last)) {
                    prevErr.put(deviceId, er);
                    String msg = ERROR_LABELS.getOrDefault(er, "Erro desconhecido (" + er + ").");
                    errorLogRepo.save(new ErrorLog(deviceId, now, er, msg));
                    log.warn("Error logged: device={} code={} msg={}", deviceId, er, msg);
                }
            } else if (er != null && er == 0) {
                prevErr.remove(deviceId);
            }

            // Persist schedule data
            if (d.has("c_pt") && d.get("c_pt").isArray()) {
                upsertSchedule(deviceId, "pet", d.get("c_pt").toString(), now);
            }
            if (d.has("c_ps") && d.get("c_ps").isObject()) {
                upsertSchedule(deviceId, "fish", d.get("c_ps").toString(), now);
            }

        } catch (Exception e) {
            log.error("Failed to process MQTT message on topic {}: {}", topic, e.getMessage(), e);
        }
    }

    /**
     * Resolve grams for a scheduled feed.
     * Uses c_pt if the nearest slot is within 30 min of the feed start time,
     * otherwise falls back to c_ps.qpc (periodic fish/auto schedule).
     */
    private int resolveScheduledGrams(String deviceId) {
        String startTs = feedStartTs.get(deviceId);
        int feedHour = -1, feedMinute = -1;
        if (startTs != null) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(startTs, DEVICE_TS_FMT);
                feedHour   = ldt.getHour();
                feedMinute = ldt.getMinute();
            } catch (Exception ignored) {}
        }

        // Try c_pt — slot mais próximo dentro de 5 minutos do horário do trato
        JsonNode cpt = lastCpt.get(deviceId);
        if (cpt != null && cpt.isArray()) {
            int bestQ    = 0;
            int bestDiff = Integer.MAX_VALUE;
            for (JsonNode slot : cpt) {
                int h   = slot.has("h") ? slot.get("h").intValue() : -1;
                int min = slot.has("m") ? slot.get("m").intValue() : -1;
                int q   = slot.has("q") ? slot.get("q").intValue() : 0;
                if (h < 0 || min < 0 || q <= 0) continue;
                int diff = (feedHour >= 0)
                        ? Math.abs((h * 60 + min) - (feedHour * 60 + feedMinute))
                        : 0;
                if (diff < bestDiff) { bestDiff = diff; bestQ = q; }
            }
            if (bestQ > 0 && (feedHour < 0 || bestDiff <= 5)) return bestQ;
        }

        // Fallback: periodic schedule (c_ps.qpc)
        JsonNode cps = lastCps.get(deviceId);
        if (cps != null && cps.has("qpc") && cps.get("qpc").isNumber()) {
            return cps.get("qpc").intValue();
        }
        return 0;
    }

    private void upsertSchedule(String deviceId, String type, String data, Instant now) {
        scheduleRepo.findByDeviceIdAndScheduleType(deviceId, type).ifPresentOrElse(
            s -> { s.setScheduleData(data); s.setUpdatedAt(now); scheduleRepo.save(s); },
            () -> scheduleRepo.save(new DeviceSchedule(deviceId, type, data, now))
        );
    }

    public boolean publishCommand(String deviceId, Map<String, Object> payload) {
        if (client == null || !client.isConnected()) {
            log.warn("Cannot publish MQTT command: client not connected");
            return false;
        }
        try {
            String json = mapper.writeValueAsString(payload);
            client.publish("devices/" + deviceId + "/cmd", json.getBytes(StandardCharsets.UTF_8), 1, false);
            return true;
        } catch (Exception e) {
            log.warn("Failed to publish MQTT command to {}: {}", deviceId, e.getMessage());
            return false;
        }
    }

    private Double  nodeDouble(JsonNode n, String k)  { return n.has(k) && n.get(k).isNumber()  ? n.get(k).doubleValue()  : null; }
    private Integer nodeInt(JsonNode n, String k)     { return n.has(k) && n.get(k).isNumber()  ? n.get(k).intValue()     : null; }
    private Boolean nodeBool(JsonNode n, String k)    { return n.has(k) && n.get(k).isBoolean() ? n.get(k).booleanValue() : null; }
    private Boolean nodeBoolean(JsonNode n, String k) {
        if (!n.has(k)) return null;
        if (n.get(k).isBoolean()) return n.get(k).booleanValue();
        if (n.get(k).isNumber())  return n.get(k).intValue() != 0;
        return null;
    }

    @PreDestroy
    public void disconnect() {
        try { if (client != null && client.isConnected()) client.disconnect(); }
        catch (MqttException ignored) {}
    }
}
