package com.wbm.feeder.controller;

import com.wbm.feeder.model.AppUser;
import com.wbm.feeder.repository.AppUserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AppUserRepository userRepo;
    private final JdbcTemplate      jdbc;

    public AuthController(AppUserRepository userRepo, JdbcTemplate jdbc) {
        this.userRepo = userRepo;
        this.jdbc     = jdbc;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email    = body.getOrDefault("email", "").trim().toLowerCase();
        String password = body.getOrDefault("password", "");

        Optional<AppUser> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty() || !checkPassword(password, userOpt.get().getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Credenciais inválidas."));
        }

        String token = generateToken();
        jdbc.update("INSERT INTO auth_token (token, user_id) VALUES (?, ?)",
                token, userOpt.get().getId());

        return ResponseEntity.ok(Map.of(
            "token", token,
            "email", userOpt.get().getEmail()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (auth != null && auth.startsWith("Bearer ")) {
            jdbc.update("DELETE FROM auth_token WHERE token = ?", auth.substring(7));
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validate(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) return ResponseEntity.status(401).build();
        String token = auth.substring(7);
        var rows = jdbc.queryForList("SELECT u.email FROM auth_token t JOIN app_user u ON u.id = t.user_id WHERE t.token = ?", token);
        if (rows.isEmpty()) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(Map.of("email", rows.get(0).get("email")));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private boolean checkPassword(String raw, String hash) {
        try {
            // Use Spring's BCrypt util
            return org.springframework.security.crypto.bcrypt.BCrypt.checkpw(raw, hash);
        } catch (Exception e) {
            return false;
        }
    }
}
