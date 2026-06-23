package com.wbm.feeder.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "feed_history")
public class FeedHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Column(nullable = false)
    private Instant timestamp;

    private Integer grams;

    @Column(nullable = false)
    private String source;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "user_name")
    private String userName;

    public FeedHistory() {}

    public FeedHistory(String deviceId, Instant timestamp, Integer grams, String source, String userEmail, String userName) {
        this.deviceId  = deviceId;
        this.timestamp = timestamp;
        this.grams     = grams;
        this.source    = source;
        this.userEmail = userEmail;
        this.userName  = userName;
    }

    public Long    getId()        { return id; }
    public String  getDeviceId()  { return deviceId; }
    public Instant getTimestamp() { return timestamp; }
    public Integer getGrams()     { return grams; }
    public String  getSource()    { return source; }
    public String  getUserEmail() { return userEmail; }
    public String  getUserName()  { return userName; }
}
