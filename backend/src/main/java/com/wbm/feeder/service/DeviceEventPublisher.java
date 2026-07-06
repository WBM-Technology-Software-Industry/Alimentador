package com.wbm.feeder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class DeviceEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(DeviceEventPublisher.class);
    private static final long DEFAULT_TIMEOUT_MS = 60 * 60 * 1000L;

    private final ObjectMapper mapper = new ObjectMapper();
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT_MS);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((error) -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            log.warn("Failed to send SSE connected event", e);
        }

        return emitter;
    }

    public void publishStatus(Object payload) {
        publishEvent("status", payload);
    }

    public void publishEvent(String event, Object payload) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(event).data(payload, String.class));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }
}
