package com.wbm.feeder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/labels")
@CrossOrigin(origins = "*")
public class DeviceLabelController {

    private final JdbcTemplate jdbc;

    public DeviceLabelController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public Map<String, String> all() {
        return jdbc.queryForList("SELECT device_id, label FROM device_label")
                .stream()
                .collect(Collectors.toMap(
                        r -> (String) r.get("device_id"),
                        r -> (String) r.get("label")
                ));
    }

    @PutMapping("/{deviceId}")
    public ResponseEntity<Void> save(@PathVariable String deviceId,
                                     @RequestBody Map<String, String> body) {
        String label = body.getOrDefault("label", "").trim();
        if (label.isEmpty()) {
            jdbc.update("DELETE FROM device_label WHERE device_id = ?", deviceId);
        } else {
            jdbc.update("""
                INSERT INTO device_label (device_id, label)
                VALUES (?, ?)
                ON CONFLICT (device_id) DO UPDATE SET label = EXCLUDED.label
                """, deviceId, label);
        }
        return ResponseEntity.noContent().build();
    }
}
