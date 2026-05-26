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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MqttIngestionService {

    private static final Logger log = LoggerFactory.getLogger(MqttIngestionService.class);
    private static final Pattern TOPIC_PATTERN = Pattern.compile("^devices/(.+)/status$");
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

    private final FeedHistoryRepository    feedHistoryRepo;
    private final DeviceTelemetryRepository telemetryRepo;
    private final DeviceScheduleRepository  scheduleRepo;
    private final ErrorLogRepository        errorLogRepo;
    private final ObjectMapper              mapper = new ObjectMapper();

    private MqttClient client;

    // Track previous al state per device to detect feeding completion
    private final Map<String, Boolean> prevAl  = new ConcurrentHashMap<>();
    private final Map<String, Double>  prevEg  = new ConcurrentHashMap<>();
    private final Map<String, Integer> prevErr = new ConcurrentHashMap<>();

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
            log.info("MQTT connected to {} — subscribed to devices/+/status", brokerUrl);
        } catch (MqttException e) {
            log.error("Failed to connect to MQTT broker: {}", e.getMessage());
        }
    }

    private void handleMessage(String topic, byte[] payload) {
        Matcher m = TOPIC_PATTERN.matcher(topic);
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
            Boolean am = nodeBool(d, "am");

            // Persist telemetry snapshot
            telemetryRepo.save(new DeviceTelemetry(deviceId, now, eg, ep, cp, tp, er));

            // Detect feeding completion: al true → false
            Boolean wasFed = prevAl.get(deviceId);
            if (Boolean.FALSE.equals(al) && Boolean.TRUE.equals(wasFed)) {
                Double prev = prevEg.getOrDefault(deviceId, 0.0);
                int grams = (eg != null && prev > 0) ? (int) Math.max(0, Math.round(prev - eg)) : 0;
                String source = Boolean.TRUE.equals(am) ? "scheduled" : "manual";
                feedHistoryRepo.save(new FeedHistory(deviceId, now, grams, source));
                log.info("Feed recorded: device={} grams={} source={}", deviceId, grams, source);
            }
            if (al != null) prevAl.put(deviceId, al);
            if (eg != null) prevEg.put(deviceId, eg);

            // Log new errors only (not repeating same code)
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
