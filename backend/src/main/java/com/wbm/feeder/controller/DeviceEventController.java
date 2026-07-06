package com.wbm.feeder.controller;

import com.wbm.feeder.service.DeviceEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DeviceEventController {

    private final DeviceEventPublisher publisher;

    public DeviceEventController(DeviceEventPublisher publisher) {
        this.publisher = publisher;
    }

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events() {
        return publisher.subscribe();
    }
}
