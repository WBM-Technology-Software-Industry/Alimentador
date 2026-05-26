package com.wbm.feeder.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "device_telemetry")
public class DeviceTelemetry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Column(nullable = false)
    private Instant timestamp;

    private Double eg;
    private Double ep;
    private Double cp;
    private Double tp;
    private Integer er;

    public DeviceTelemetry() {}

    public DeviceTelemetry(String deviceId, Instant timestamp,
                           Double eg, Double ep, Double cp, Double tp, Integer er) {
        this.deviceId  = deviceId;
        this.timestamp = timestamp;
        this.eg = eg; this.ep = ep; this.cp = cp; this.tp = tp; this.er = er;
    }

    public Long    getId()        { return id; }
    public String  getDeviceId()  { return deviceId; }
    public Instant getTimestamp() { return timestamp; }
    public Double  getEg()        { return eg; }
    public Double  getEp()        { return ep; }
    public Double  getCp()        { return cp; }
    public Double  getTp()        { return tp; }
    public Integer getEr()        { return er; }
}
