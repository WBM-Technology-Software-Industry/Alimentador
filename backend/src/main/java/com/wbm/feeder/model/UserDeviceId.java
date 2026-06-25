package com.wbm.feeder.model;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class UserDeviceId implements Serializable {
    private Long    userId;
    private String  deviceId;

    public UserDeviceId() {}
    public UserDeviceId(Long userId, String deviceId) {
        this.userId = userId;
        this.deviceId = deviceId;
    }

    public Long getUserId() { return userId; }
    public String getDeviceId() { return deviceId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDeviceId that = (UserDeviceId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(deviceId, that.deviceId);
    }
    @Override
    public int hashCode() { return Objects.hash(userId, deviceId); }
}