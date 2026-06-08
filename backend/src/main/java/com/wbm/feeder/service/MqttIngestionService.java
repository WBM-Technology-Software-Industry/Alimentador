package com.wbm.feeder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wbm.feeder.model.*;
import com.wbm.feeder.repository.*;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
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

    private final FeedHistoryRepository     feedHistoryRepo;
    private final DeviceTelemetryRepository telemetryRepo;
    private final DeviceScheduleRepository  scheduleRepo;
    private final ErrorLogRepository        errorLogRepo;
    private final ObjectMapper              mapper = new ObjectMapper();

    private MqttClient client;

    private final Map<String, Boolean> prevAl  = new ConcurrentHashMap<>();
    private final Map<String, Integer> prevErr = new ConcurrentHashMap<>();
    // Store schedule payload from the device status for grams lookup
    private final Map<String, JsonNode> lastCpt   = new ConcurrentHashMap<>();
    private final Map<String, JsonNode> lastCps   = new ConcurrentHashMap<>();
    private final Map<String, Integer>  lastPf    = new ConcurrentHashMap<>();
    // Device local time at feed start (al: false → true)
    private final Map<String, String>   feedStartTs = new ConcurrentHashMap<>();

    public MqttIngestionService(FeedHistoryRepository feedHistoryRepo,
                                DeviceTelemetryRepository telemetryRepo,
                                DeviceScheduleRepository scheduleRepo,
                                ErrorLogRepository errorLogRepo) {
        this.feedHistoryRepo = feedHistoryRepo;
        this.telemetryRepo   = telemetryRepo;
        this.scheduleRepo    = scheduleRepo;
        this.errorLogRepo    = errorLogRepo;
    }

    @PostConstruct
    public void connect() {
        try {
            client = new MqttClient(brokerUrl, "feeder-backend-" + System.currentTimeMillis());
            MqttConnectOptions opts = new MqttConnectOptions();
            opts.setAutomaticReconnect(true);
            opts.setCleanSession(true);
            opts.setConnectionTimeout(10);

            client.setCallback(new MqttCallback() {
                @Override public void connectionLost(Throwable cause) {
                    log.warn("MQTT connection lost: {}", cause.getMessage());
                }
                @Override public void messageArrived(String topic, MqttMessage message) {
                    handleMessage(topic, message.getPayload());
                }
                @Override public void deliveryComplete(IMqttDeliveryToken token) {}
            });

            client.connect(opts);
            client.subscribe("devices/+/status", 1);
            client.subscribe("devices/+/cmd", 1);
            log.info("MQTT connected to {} — subscribed to devices/+/status and devices/+/cmd", brokerUrl);
        } catch (MqttException e) {
            log.error("Failed to connect to MQTT broker: {}", e.getMessage());
        }
    }

    private void handleMessage(String topic, byte[] payload) {
        Matcher mc = TOPIC_CMD.matcher(topic);
        if (mc.matches()) {
            try {
                JsonNode cmd = mapper.readTree(payload);
                // cmd topic monitoring only — manual feeds are saved by the frontend
                log.debug("Cmd received on topic {}: {}", topic, new String(payload));
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

            // Update cached schedule and profile
            if (pf != null) lastPf.put(deviceId, pf);
            if (d.has("c_pt") && d.get("c_pt").isArray())  lastCpt.put(deviceId, d.get("c_pt"));
            if (d.has("c_ps") && d.get("c_ps").isObject()) lastCps.put(deviceId, d.get("c_ps"));

            Boolean wasFed = prevAl.get(deviceId);

            // Track device local time at feed start (for schedule matching)
            if (Boolean.TRUE.equals(al) && !Boolean.TRUE.equals(wasFed) && ts != null) {
                feedStartTs.put(deviceId, ts);
            }

            // Feed history is saved entirely by the frontend to avoid race conditions
            if (al != null) prevAl.put(deviceId, al);

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
            log.debug("Failed to process MQTT message: {}", e.getMessage());
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

        // Try c_pt with 30-minute threshold
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
