package com.wbm.feeder.controller;

import com.wbm.feeder.dto.ErrorLogDto;
import com.wbm.feeder.dto.FeedHistoryDto;
import com.wbm.feeder.dto.TelemetryDto;
import com.wbm.feeder.model.FeedHistory;
import com.wbm.feeder.repository.*;
import com.wbm.feeder.dto.DeviceStatsDto;
import com.wbm.feeder.service.DeviceStatsService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate              jdbc;
    private final DeviceStatsService        statsService;

    public DeviceController(FeedHistoryRepository feedHistoryRepo,
                            DeviceTelemetryRepository telemetryRepo,
                            DeviceScheduleRepository scheduleRepo,
                            ErrorLogRepository errorLogRepo,
                            DeviceLastSeenRepository lastSeenRepo,
                            JdbcTemplate jdbc,
                            DeviceStatsService statsService) {
        this.feedHistoryRepo = feedHistoryRepo;
        this.telemetryRepo   = telemetryRepo;
        this.scheduleRepo    = scheduleRepo;
        this.errorLogRepo    = errorLogRepo;
        this.lastSeenRepo    = lastSeenRepo;
        this.jdbc            = jdbc;
        this.statsService    = statsService;
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
    public ResponseEntity<FeedHistoryDto> addHistory(
            @PathVariable String deviceId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {

        int    grams = body.containsKey("grams")  ? ((Number) body.get("grams")).intValue() : 0;
        String src   = body.containsKey("source") ? (String) body.get("source") : "manual";

        if (grams <= 0) return ResponseEntity.badRequest().build();

        String userName  = null;
        String userEmail = null;

        if ("scheduled".equals(src)) {
            userName = "Sistema";
        } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            var rows = jdbc.queryForList(
                "SELECT u.name, u.email FROM auth_token t JOIN app_user u ON u.id = t.user_id WHERE t.token = ?",
                token);
            if (!rows.isEmpty()) {
                userName  = (String) rows.get(0).get("name");
                userEmail = (String) rows.get(0).get("email");
            }
        }

        if (feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(
                deviceId, grams, src, Instant.now().minusSeconds(120))) {
            return feedHistoryRepo
                    .findByDeviceIdOrderByTimestampDesc(deviceId, PageRequest.of(0, 1))
                    .stream().findFirst()
                    .map(FeedHistoryDto::from)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.ok().build());
        }

        FeedHistory entry = feedHistoryRepo.save(
            new FeedHistory(deviceId, Instant.now(), grams, src, userEmail, userName));
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
    @GetMapping("/stats")
    public ResponseEntity<DeviceStatsDto> getStats(@PathVariable String deviceId) {
        return ResponseEntity.ok(statsService.getStats(deviceId));
    }


}// fim
