package com.wbm.feeder.dto;

import com.wbm.feeder.model.FeedHistory;

public record FeedHistoryDto(
        Long   id,
        String deviceId,
        String timestamp,
        int    grams,
        String source,
        String userEmail,
        String userName
) {
    public static FeedHistoryDto from(FeedHistory e) {
        return new FeedHistoryDto(
                e.getId(),
                e.getDeviceId(),
                e.getTimestamp().toString(),
                e.getGrams() != null ? e.getGrams() : 0,
                e.getSource(),
                e.getUserEmail(),
                e.getUserName()
        );
    }
}
