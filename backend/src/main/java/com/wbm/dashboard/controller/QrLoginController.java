package com.wbm.dashboard.controller;

import com.wbm.dashboard.entity.User;
import com.wbm.dashboard.repository.UserRepository;
import com.wbm.dashboard.security.JwtUtil;
import com.wbm.dashboard.service.QrSessionService;
import com.wbm.dashboard.service.TotpService;
import dev.samstevens.totp.exceptions.QrGenerationException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/qr")
@RequiredArgsConstructor
public class QrLoginController {

    private final QrSessionService qrSessionService;
    private final TotpService totpService;
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /** Login page chama este endpoint para obter o sessionId + QR image. */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generate() throws QrGenerationException {
        String sessionId = qrSessionService.create();
        String approveUrl = frontendUrl + "/auth/approve?s=" + sessionId;
        String qrUri = totpService.getQrImageDataUri(approveUrl, sessionId);
        // Sobrescreve o QR gerado pelo TotpService com um que contém a URL real
        // Usamos ZXing diretamente para gerar QR com a URL
        String qrImage = generateUrlQr(approveUrl);
        return ResponseEntity.ok(Map.of("sessionId", sessionId, "qrUri", qrImage));
    }

    /** Login page faz polling neste endpoint. */
    @GetMapping("/poll/{sessionId}")
    public ResponseEntity<Map<String, Object>> poll(@PathVariable String sessionId) {
        QrSessionService.PollResult result = qrSessionService.poll(sessionId);
        return ResponseEntity.ok(Map.of(
                "status", result.status().name().toLowerCase(),
                "token",  result.jwt() != null ? result.jwt() : ""
        ));
    }

    /** Celular chama este endpoint após autenticar. */
    @PostMapping("/approve/{sessionId}")
    public ResponseEntity<Map<String, String>> approve(
            @PathVariable String sessionId,
            @RequestBody Map<String, String> body) {

        String email    = body.get("email");
        String password = body.get("password");

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        String jwt = jwtUtil.generateToken(user.getEmail());

        if (!qrSessionService.approve(sessionId, jwt)) {
            throw new ResponseStatusException(HttpStatus.GONE, "QR expirado.");
        }

        return ResponseEntity.ok(Map.of("message", "Login aprovado!"));
    }

    private String generateUrlQr(String url) {
        try {
            com.google.zxing.BarcodeFormat format = com.google.zxing.BarcodeFormat.QR_CODE;
            com.google.zxing.MultiFormatWriter writer = new com.google.zxing.MultiFormatWriter();
            com.google.zxing.common.BitMatrix matrix = writer.encode(url, format, 300, 300);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            com.google.zxing.client.j2se.MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return "data:image/png;base64," + java.util.Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Falha ao gerar QR", e);
        }
    }
}
