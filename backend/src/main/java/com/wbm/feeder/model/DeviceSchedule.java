package com.wbm.feeder.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "device_schedule")
public class DeviceSchedule {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Column(name = "schedule_type", nullable = false)
    private String scheduleType;

    @Column(name = "schedule_data", columnDefinition = "text")
    private String scheduleData;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public DeviceSchedule() {}

    public DeviceSchedule(String deviceId, String scheduleType, String scheduleData, Instant updatedAt) {
        this.deviceId     = deviceId;
        this.scheduleType = scheduleType;
        this.scheduleData = scheduleData;
        this.updatedAt    = updatedAt;
    }

    public Long    getId()           { return id; }
    public String  getDeviceId()     { return deviceId; }
    public String  getScheduleType() { return scheduleType; }
    public String  getScheduleData() { return scheduleData; }
    public Instant getUpdatedAt()    { return updatedAt; }
    public void    setScheduleData(String data)    { this.scheduleData = data; }
    public void    setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
