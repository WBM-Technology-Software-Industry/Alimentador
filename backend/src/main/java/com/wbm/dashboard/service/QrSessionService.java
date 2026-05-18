package com.wbm.dashboard.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class QrSessionService {

    private static final int TTL_SECONDS = 120;

    public enum Status { PENDING, APPROVED, EXPIRED }

    private record QrEntry(Status status, String jwt, Instant expiresAt) {}

    private final ConcurrentHashMap<String, QrEntry> store = new ConcurrentHashMap<>();

    /** Cria uma sessão pendente. Retorna o sessionId. */
    public String create() {
        store.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(Instant.now()));
        String id = UUID.randomUUID().toString();
        store.put(id, new QrEntry(Status.PENDING, null, Instant.now().plusSeconds(TTL_SECONDS)));
        return id;
    }

    /** Marca a sessão como aprovada com o JWT do usuário. */
    public boolean approve(String sessionId, String jwt) {
        QrEntry entry = store.get(sessionId);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) return false;
        store.put(sessionId, new QrEntry(Status.APPROVED, jwt, entry.expiresAt()));
        return true;
    }

    /** Retorna o status e o JWT (se aprovado). Remove após entregar o JWT. */
    public record PollResult(Status status, String jwt) {}

    public PollResult poll(String sessionId) {
        QrEntry entry = store.get(sessionId);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            store.remove(sessionId);
            return new PollResult(Status.EXPIRED, null);
        }
        if (entry.status() == Status.APPROVED) {
            store.remove(sessionId);
            return new PollResult(Status.APPROVED, entry.jwt());
        }
        return new PollResult(Status.PENDING, null);
    }
}
