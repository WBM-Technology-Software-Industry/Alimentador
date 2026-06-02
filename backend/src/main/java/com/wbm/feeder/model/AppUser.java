package com.wbm.feeder.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId()                  { return id; }
    public String getEmail()             { return email; }
    public String getPasswordHash()      { return passwordHash; }
}
