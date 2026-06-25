package com.wbm.feeder.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_device")
public class UserDevice {

    @EmbeddedId
    private UserDeviceId id;

    public UserDevice() {}

    public UserDevice(Long userId, String deviceId) {
        this.id = new UserDeviceId(userId, deviceId);
    }

    public UserDeviceId getId()  { return id; }
    public String getDeviceId()  { return id.getDeviceId(); }
    public Long getUserId()      { return id.getUserId(); }
}
