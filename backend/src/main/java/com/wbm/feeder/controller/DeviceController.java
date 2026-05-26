package com.wbm.feeder.controller;

import com.wbm.feeder.model.*;
import com.wbm.feeder.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/devices/{deviceId}")
@CrossOrigin(origins = "*")
public class DeviceController {

    private final FeedHistoryRepository     feedHistoryRepo;
    private final DeviceTelemetryRepository telemetryRepo;
    private final DeviceScheduleRepository  scheduleRepo;
    private final ErrorLogRepository        errorLogRepo;

    public DeviceController(FeedHistoryRepository feedHistoryRepo,
                            DeviceTelemetryRepository telemetryRepo,
                            DeviceScheduleRepository scheduleRepo,
                            ErrorLogRepository errorLogRepo) {
        this.feedHistoryRepo = feedHistoryRepo;
        this.telemetryRepo   = telemetryRepo;
        this.scheduleRepo    = scheduleRepo;
        this.errorLogRepo    = errorLogRepo;
    }

    @GetMapping("/history")
    public List<FeedHistory> history(@PathVariable String deviceId,
                                     @RequestParam(defaultValue = "100") int limit) {
        return feedHistoryRepo.findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, limit));
    }

    @GetMapping("/telemetry")
    public List<DeviceTelemetry> telemetry(@PathVariable String deviceId,
                                           @RequestParam(defaultValue = "200") int limit) {
        return telemetryRepo.findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, limit));
    }

    @GetMapping("/telemetry/latest")
    public DeviceTelemetry latestTelemetry(@PathVariable String deviceId) {
        return telemetryRepo.findTopByDeviceIdOrderByTimestampDesc(deviceId).orElse(null);
    }

    @GetMapping("/schedules")
    public List<DeviceSchedule> schedules(@PathVariable String deviceId) {
        return scheduleRepo.findByDeviceId(deviceId);
    }

    @GetMapping("/errors")
    public List<ErrorLog> errors(@PathVariable String deviceId,
                                 @RequestParam(defaultValue = "50") int limit) {
        return errorLogRepo.findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, limit));
    }

    @PostMapping("/history")
    public ResponseEntity<FeedHistory> addHistory(@PathVariable String deviceId,
                                                  @RequestBody Map<String, Object> body) {
        int grams  = body.containsKey("grams")  ? ((Number) body.get("grams")).intValue()  : 0;
        String src = body.containsKey("source") ? (String) body.get("source") : "manual";
        FeedHistory entry = feedHistoryRepo.save(new FeedHistory(deviceId, Instant.now(), grams, src));
        return ResponseEntity.ok(entry);
    }

    @DeleteMapping("/history")
    public void clearHistory(@PathVariable String deviceId) {
        feedHistoryRepo.deleteByDeviceId(deviceId);
    }
}
