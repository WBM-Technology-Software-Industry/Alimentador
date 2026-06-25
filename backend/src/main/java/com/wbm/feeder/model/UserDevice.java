package com.wbm.feeder.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_device")
public class UserDevice {

    @EmbeddedId
    private UserDeviceId id;

    @Column(name = "profile", nullable = false)
    private String profile;

    public UserDevice() {}

    public UserDevice(Long userId, String deviceId, String profile) {
        this.id = new UserDeviceId(userId, deviceId);
        this.profile = profile;
    }
    public UserDeviceId getId()      { return id; }
    public String getDeviceId()      { return id.getDeviceId(); }
    public Long getUserId()          { return id.getUserId(); }
    public String getProfile()       { return profile; }
    public void setProfile(String p) { this.profile = p; }
}