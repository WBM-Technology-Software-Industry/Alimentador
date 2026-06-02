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
        3,  "Sensor capacitivo detectou falta de ração.",
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

    private final Map<String, Boolean> prevAl      = new ConcurrentHashMap<>();
    private final Map<String, Integer> prevErr     = new ConcurrentHashMap<>();
    private final Map<String, Instant> lastSimCmd  = new ConcurrentHashMap<>();
    private final Map<String, Integer> lastSimGrams = new ConcurrentHashMap<>();
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
            client.subscribe("devices/+/cmd", 0);
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
                if (cmd.has("sim") && cmd.get("sim").isNumber() && cmd.get("sim").intValue() > 0) {
                    String devId = mc.group(1);
                    lastSimCmd.put(devId, Instant.now());
                    lastSimGrams.put(devId, cmd.get("sim").intValue());
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

            telemetryRepo.save(new DeviceTelemetry(deviceId, now, eg, ep, cp, tp, er));

            // Update cached schedule and profile
            if (pf != null) lastPf.put(deviceId, pf);
            if (d.has("c_pt") && d.get("c_pt").isArray())  lastCpt.put(deviceId, d.get("c_pt"));
            if (d.has("c_ps") && d.get("c_ps").isObject()) lastCps.put(deviceId, d.get("c_ps"));

            Boolean wasFed = prevAl.get(deviceId);

            // Track device local time at feed start (for schedule matching)
            if (Boolean.TRUE.equals(al) && !Boolean.TRUE.equals(wasFed) && ts != null) {
                feedStartTs.put(deviceId, ts);
            }

            // Detect feeding completion: al true → false
            if (Boolean.FALSE.equals(al) && Boolean.TRUE.equals(wasFed)) {
                Instant lastSim = lastSimCmd.get(deviceId);
                String  source  = (lastSim != null && lastSim.isAfter(now.minusSeconds(300))) ? "manual" : "scheduled";

                {
                    // Scheduled: use configured grams from schedule (sensor unreliable during motor run)
                    // Manual: use grams from the sim command tracked via cmd topic
                    int grams = "scheduled".equals(source)
                            ? resolveScheduledGrams(deviceId)
                            : lastSimGrams.getOrDefault(deviceId, 0);

                    if (grams > 0) {
                        boolean duplicate = feedHistoryRepo.existsByDeviceIdAndGramsAndTimestampAfter(
                                deviceId, grams, now.minusSeconds(120));
                        if (!duplicate) {
                            feedHistoryRepo.save(new FeedHistory(deviceId, now, grams, source));
                            log.info("Feed recorded: device={} grams={} source={}", deviceId, grams, source);
                            // Clear manual tracking after save — prevents al glitch from saving twice
                            if ("manual".equals(source)) {
                                lastSimCmd.remove(deviceId);
                                lastSimGrams.remove(deviceId);
                            }
                        } else {
                            log.debug("Feed skipped (duplicate): device={} grams={}", deviceId, grams);
                        }
                    } else {
                        log.debug("Feed skipped (grams=0): device={} source={}", deviceId, source);
                    }
                }
            }

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
     * Resolve grams for a scheduled feed using the device's own schedule config.
     * Dog profile (pf=1): find the c_pt slot closest to the feed start time.
     * Fish profile (pf=2): use c_ps.qpc (quantity per cycle).
     */
    private int resolveScheduledGrams(String deviceId) {
        int pf = lastPf.getOrDefault(deviceId, 1);

        if (pf == 2) {
            JsonNode cps = lastCps.get(deviceId);
            if (cps != null && cps.has("qpc") && cps.get("qpc").isNumber()) {
                return cps.get("qpc").intValue();
            }
            return 0;
        }

        // Dog profile: match feed start time against c_pt slots
        JsonNode cpt = lastCpt.get(deviceId);
        if (cpt == null || !cpt.isArray() || cpt.isEmpty()) return 0;

        String startTs = feedStartTs.get(deviceId);
        int feedHour = -1, feedMinute = -1;
        if (startTs != null) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(startTs, DEVICE_TS_FMT);
                feedHour   = ldt.getHour();
                feedMinute = ldt.getMinute();
            } catch (Exception ignored) {}
        }

        int bestQ    = 0;
        int bestDiff = Integer.MAX_VALUE;
        for (JsonNode slot : cpt) {
            int h = slot.has("h") ? slot.get("h").intValue() : -1;
            int min = slot.has("m") ? slot.get("m").intValue() : -1;
            int q = slot.has("q") ? slot.get("q").intValue() : 0;
            if (h < 0 || min < 0 || q <= 0) continue;

            int diff = (feedHour >= 0)
                    ? Math.abs((h * 60 + min) - (feedHour * 60 + feedMinute))
                    : 0;
            if (diff < bestDiff) {
                bestDiff = diff;
                bestQ    = q;
            }
        }
        // Accept match within 5 minutes, or take best available if no timestamp
        return (feedHour < 0 || bestDiff <= 5) ? bestQ : 0;
    }

    private void upsertSchedule(String deviceId, String type, String data, Instant now) {
        scheduleRepo.findByDeviceIdAndScheduleType(deviceId, type).ifPresentOrElse(
            s -> { s.setScheduleData(data); s.setUpdatedAt(now); scheduleRepo.save(s); },
            () -> scheduleRepo.save(new DeviceSchedule(deviceId, type, data, now))
        );
    }

    private Double  nodeDouble(JsonNode n, String k) { return n.has(k) && n.get(k).isNumber() ? n.get(k).doubleValue() : null; }
    private Integer nodeInt(JsonNode n, String k)    { return n.has(k) && n.get(k).isNumber() ? n.get(k).intValue()    : null; }
    private Boolean nodeBool(JsonNode n, String k)   { return n.has(k) && n.get(k).isBoolean() ? n.get(k).booleanValue() : null; }

    @PreDestroy
    public void disconnect() {
        try { if (client != null && client.isConnected()) client.disconnect(); }
        catch (MqttException ignored) {}
    }
}
