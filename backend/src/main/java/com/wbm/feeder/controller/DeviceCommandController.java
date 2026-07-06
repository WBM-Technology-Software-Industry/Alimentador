package com.wbm.feeder.controller;

import com.wbm.feeder.service.MqttIngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/devices/{deviceId}")
@CrossOrigin(origins = "*")
public class DeviceCommandController {

    private final MqttIngestionService mqttIngestionService;

    public DeviceCommandController(MqttIngestionService mqttIngestionService) {
        this.mqttIngestionService = mqttIngestionService;
    }

    @PostMapping("/cmd")
    public ResponseEntity<Void> sendCommand(@PathVariable String deviceId,
                                            @RequestBody Map<String, Object> payload) {
        boolean sent = mqttIngestionService.publishCommand(deviceId, payload);
        return sent ? ResponseEntity.ok().build() : ResponseEntity.status(503).build();
    }
}
