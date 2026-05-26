package com.wbm.feeder.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "error_log")
public class ErrorLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(name = "error_code", nullable = false)
    private Integer errorCode;

    @Column(name = "error_message")
    private String errorMessage;

    public ErrorLog() {}

    public ErrorLog(String deviceId, Instant timestamp, Integer errorCode, String errorMessage) {
        this.deviceId     = deviceId;
        this.timestamp    = timestamp;
        this.errorCode    = errorCode;
        this.errorMessage = errorMessage;
    }

    public Long    getId()           { return id; }
    public String  getDeviceId()     { return deviceId; }
    public Instant getTimestamp()    { return timestamp; }
    public Integer getErrorCode()    { return errorCode; }
    public String  getErrorMessage() { return errorMessage; }
}
