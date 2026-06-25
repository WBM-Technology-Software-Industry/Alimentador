package com.wbm.feeder.controller;

import com.wbm.feeder.model.UserDevice;
import com.wbm.feeder.repository.UserDeviceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/me")
@CrossOrigin(origins = "*")
public class UserDeviceController {

    private final UserDeviceRepository userDeviceRepo;
    private final JdbcTemplate         jdbc;

    public UserDeviceController(UserDeviceRepository userDeviceRepo, JdbcTemplate jdbc) {
        this.userDeviceRepo = userDeviceRepo;
        this.jdbc           = jdbc;
    }

    @GetMapping("/devices")
    public ResponseEntity<List<Map<String, String>>> myDevices(
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        var rows = jdbc.queryForList(
                "SELECT u.id FROM auth_token t JOIN app_user u ON u.id = t.user_id WHERE t.token = ?",
                token);

        if (rows.isEmpty()) return ResponseEntity.status(401).build();

        Long userId = ((Number) rows.get(0).get("id")).longValue();

        List<Map<String, String>> result = userDeviceRepo.findByIdUserId(userId)
                .stream()
                .map(ud -> Map.of(
                        "deviceId", ud.getDeviceId(),
                        "profile",  ud.getProfile()
                ))
                .toList();

        return ResponseEntity.ok(result);
    }
}
