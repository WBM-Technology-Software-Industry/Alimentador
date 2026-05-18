package com.wbm.dashboard.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class OtpService {

    private static final int EXPIRY_SECONDS = 600; // 10 minutos
    private static final int MAX_ATTEMPTS   = 5;

    private record OtpEntry(String email, String code, Instant expiresAt, AtomicInteger attempts) {}

    private final ConcurrentHashMap<String, OtpEntry> store = new ConcurrentHashMap<>();
    private final SecureRandom rng = new SecureRandom();

    public record OtpResult(String tempToken, String code) {}

    public OtpResult generate(String email) {
        store.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(Instant.now()));

        String code      = String.format("%06d", rng.nextInt(1_000_000));
        String tempToken = UUID.randomUUID().toString();
        store.put(tempToken, new OtpEntry(email, code, Instant.now().plusSeconds(EXPIRY_SECONDS), new AtomicInteger(0)));
        return new OtpResult(tempToken, code);
    }

    /** Retorna o email se o código for válido, null caso contrário. Remove a entrada. */
    public String validate(String tempToken, String code) {
        OtpEntry entry = store.get(tempToken);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            store.remove(tempToken);
            return null;
        }

        int attempt = entry.attempts().incrementAndGet();
        if (!entry.code().equals(code)) {
            if (attempt >= MAX_ATTEMPTS) store.remove(tempToken);
            return null;
        }

        store.remove(tempToken);
        return entry.email();
    }

    /** Retorna o email associado ao tempToken sem removê-lo (para fluxo TOTP). */
    public String resolveEmail(String tempToken) {
        OtpEntry entry = store.get(tempToken);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            store.remove(tempToken);
            return null;
        }
        return entry.email();
    }

    /** Remove o tempToken após validação externa (ex.: TOTP). */
    public void consume(String tempToken) {
        store.remove(tempToken);
    }
}
