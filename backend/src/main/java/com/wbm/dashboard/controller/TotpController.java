package com.wbm.dashboard.controller;

import com.wbm.dashboard.entity.User;
import com.wbm.dashboard.repository.UserRepository;
import com.wbm.dashboard.security.JwtUtil;
import com.wbm.dashboard.service.TotpService;
import dev.samstevens.totp.exceptions.QrGenerationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/me/totp")
@RequiredArgsConstructor
public class TotpController {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final TotpService totpService;

    // Segredos pendentes de confirmação (antes de salvar no banco)
    private final ConcurrentHashMap<String, String> pendingSecrets = new ConcurrentHashMap<>();

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@RequestHeader("Authorization") String authHeader) {
        User user = resolveUser(authHeader);
        return ResponseEntity.ok(Map.of("enabled", user.getTotpSecret() != null));
    }

    @GetMapping("/setup")
    public ResponseEntity<Map<String, Object>> setup(@RequestHeader("Authorization") String authHeader)
            throws QrGenerationException {
        User user = resolveUser(authHeader);
        String secret = totpService.generateSecret();
        pendingSecrets.put(user.getEmail(), secret);
        String qrUri = totpService.getQrImageDataUri(user.getEmail(), secret);
        return ResponseEntity.ok(Map.of("secret", secret, "qrUri", qrUri));
    }

    @PostMapping("/enable")
    public ResponseEntity<Map<String, Object>> enable(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {

        User user = resolveUser(authHeader);
        String secret = pendingSecrets.get(user.getEmail());
        if (secret == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inicie o setup primeiro.");
        }
        String code = body.get("code");
        if (!totpService.verifyCode(secret, code)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código inválido.");
        }
        user.setTotpSecret(secret);
        userRepository.save(user);
        pendingSecrets.remove(user.getEmail());
        return ResponseEntity.ok(Map.of("enabled", true));
    }

    @DeleteMapping("/disable")
    public ResponseEntity<Map<String, Object>> disable(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {

        User user = resolveUser(authHeader);
        if (user.getTotpSecret() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2FA não está ativo.");
        }
        String code = body.get("code");
        if (!totpService.verifyCode(user.getTotpSecret(), code)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código inválido.");
        }
        user.setTotpSecret(null);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("enabled", false));
    }

    private User resolveUser(String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtUtil.extractEmail(token);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado."));
    }
}
