package com.wbm.feeder.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "device_last_seen")
public class DeviceLastSeen {

    @Id
    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Column(name = "last_seen", nullable = false)
    private Instant lastSeen;

    public DeviceLastSeen() {}

    public DeviceLastSeen(String deviceId, Instant lastSeen) {
        this.deviceId = deviceId;
        this.lastSeen = lastSeen;
    }

    public String  getDeviceId() { return deviceId; }
    public Instant getLastSeen() { return lastSeen; }
    public void    setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }
}
