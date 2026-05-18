package com.wbm.dashboard.controller;

import com.wbm.dashboard.dto.AuthResponse;
import com.wbm.dashboard.dto.LoginRequest;
import com.wbm.dashboard.dto.OtpVerifyRequest;
import com.wbm.dashboard.entity.User;
import com.wbm.dashboard.repository.UserRepository;
import com.wbm.dashboard.security.JwtUtil;
import com.wbm.dashboard.service.EmailService;
import com.wbm.dashboard.service.OtpService;
import com.wbm.dashboard.service.TotpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final OtpService otpService;
    private final EmailService emailService;
    private final TotpService totpService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas"));

        boolean hasTotp = user.getTotpSecret() != null;
        OtpService.OtpResult otp = otpService.generate(user.getEmail());

        if (!hasTotp) {
            emailService.sendOtp(user.getEmail(), otp.code());
        }

        return ResponseEntity.ok(AuthResponse.builder()
                .pending(true)
                .tempToken(otp.tempToken())
                .totpEnabled(hasTotp)
                .build());
    }

    @PostMapping("/login/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        String email;

        String resolvedEmail = otpService.resolveEmail(request.getTempToken());
        if (resolvedEmail == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão expirada. Faça login novamente.");
        }

        User user = userRepository.findByEmail(resolvedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado."));

        if (user.getTotpSecret() != null) {
            if (!totpService.verifyCode(user.getTotpSecret(), request.getCode())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código inválido.");
            }
            otpService.consume(request.getTempToken());
        } else {
            email = otpService.validate(request.getTempToken(), request.getCode());
            if (email == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código inválido ou expirado.");
            }
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .user(toUserResponse(user))
                .build());
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserResponse> me(
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        String email = jwtUtil.extractEmail(token);
        User user = userRepository.findByEmail(email).orElseThrow();

        return ResponseEntity.ok(toUserResponse(user));
    }

    private AuthResponse.UserResponse toUserResponse(User user) {
        String avatarUrl = null;
        if (user.getAvatarPath() != null) {
            avatarUrl = "files/" + user.getAvatarPath();
        }
        return AuthResponse.UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(avatarUrl)
                .build();
    }
}
