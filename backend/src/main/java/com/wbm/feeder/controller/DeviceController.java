package com.wbm.feeder.controller;

import com.wbm.feeder.dto.ErrorLogDto;
import com.wbm.feeder.dto.FeedHistoryDto;
import com.wbm.feeder.dto.TelemetryDto;
import com.wbm.feeder.model.FeedHistory;
import com.wbm.feeder.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/devices/{deviceId}")
@CrossOrigin(origins = "*")
public class DeviceController {

    private final FeedHistoryRepository     feedHistoryRepo;
    private final DeviceTelemetryRepository telemetryRepo;
    private final DeviceScheduleRepository  scheduleRepo;
    private final ErrorLogRepository        errorLogRepo;
    private final DeviceLastSeenRepository  lastSeenRepo;

    public DeviceController(FeedHistoryRepository feedHistoryRepo,
                            DeviceTelemetryRepository telemetryRepo,
                            DeviceScheduleRepository scheduleRepo,
                            ErrorLogRepository errorLogRepo,
                            DeviceLastSeenRepository lastSeenRepo) {
        this.feedHistoryRepo = feedHistoryRepo;
        this.telemetryRepo   = telemetryRepo;
        this.scheduleRepo    = scheduleRepo;
        this.errorLogRepo    = errorLogRepo;
        this.lastSeenRepo    = lastSeenRepo;
    }

    @GetMapping("/last-seen")
    public ResponseEntity<Map<String, String>> lastSeen(@PathVariable String deviceId) {
        return lastSeenRepo.findById(deviceId)
            .map(ls -> {
                Map<String, String> body = new HashMap<>();
                body.put("lastSeen", ls.getLastSeen().toString());
                return ResponseEntity.ok(body);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/history")
    public List<FeedHistoryDto> history(@PathVariable String deviceId,
                                        @RequestParam(defaultValue = "100") int limit) {
        return feedHistoryRepo
                .findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, limit))
                .stream()
                .map(FeedHistoryDto::from)
                .toList();
    }

    @GetMapping("/telemetry")
    public List<TelemetryDto> telemetry(@PathVariable String deviceId,
                                        @RequestParam(defaultValue = "200") int limit) {
        return telemetryRepo
                .findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, limit))
                .stream()
                .map(TelemetryDto::from)
                .toList();
    }

    @GetMapping("/telemetry/latest")
    public ResponseEntity<TelemetryDto> latestTelemetry(@PathVariable String deviceId) {
        return telemetryRepo
                .findTopByDeviceIdOrderByTimestampDesc(deviceId)
                .map(TelemetryDto::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/errors")
    public List<ErrorLogDto> errors(@PathVariable String deviceId,
                                    @RequestParam(defaultValue = "50") int limit) {
        return errorLogRepo
                .findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, limit))
                .stream()
                .map(ErrorLogDto::from)
                .toList();
    }

    @PostMapping("/history")
    public ResponseEntity<FeedHistoryDto> addHistory(@PathVariable String deviceId,
                                                     @RequestBody Map<String, Object> body) {
        int grams        = body.containsKey("grams")  ? ((Number) body.get("grams")).intValue() : 0;
        String src       = body.containsKey("source") ? (String) body.get("source") : "manual";
        String userEmail = body.containsKey("user")   ? (String) body.get("user")   : null;

        if (grams <= 0) return ResponseEntity.badRequest().build();

        if (feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(
                deviceId, grams, src, Instant.now().minusSeconds(120))) {
            return feedHistoryRepo
                    .findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, 1))
                    .stream().findFirst()
                    .map(FeedHistoryDto::from)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.ok().build());
        }

        FeedHistory entry = feedHistoryRepo.save(new FeedHistory(deviceId, Instant.now(), grams, src, userEmail));
        return ResponseEntity.ok(FeedHistoryDto.from(entry));
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<Void> deleteHistoryEntry(@PathVariable String deviceId, @PathVariable Long id) {
        if (!feedHistoryRepo.existsById(id)) return ResponseEntity.notFound().build();
        feedHistoryRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/history")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> clearHistory(@PathVariable String deviceId) {
        feedHistoryRepo.deleteByDeviceId(deviceId);
        return ResponseEntity.noContent().build();
    }
}
