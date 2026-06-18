package com.wbm.feeder.dto;

import com.wbm.feeder.model.ErrorLog;

public record ErrorLogDto(
        Long    id,
        String  deviceId,
        String  timestamp,
        int     errorCode,
        String  errorMessage
) {
    public static ErrorLogDto from(ErrorLog e) {
        return new ErrorLogDto(
                e.getId(),
                e.getDeviceId(),
                e.getTimestamp().toString(),
                e.getErrorCode(),
                e.getErrorMessage()
        );
    }
}
