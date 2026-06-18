package com.wbm.feeder.dto;

import com.wbm.feeder.model.DeviceTelemetry;

public record TelemetryDto(
        Long    id,
        String  deviceId,
        String  timestamp,
        Double  eg,
        Double  ep,
        Double  cp,
        Double  tp,
        Integer er,
        Boolean al,
        Boolean am,
        Integer pf
) {
    public static TelemetryDto from(DeviceTelemetry e) {
        return new TelemetryDto(
                e.getId(),
                e.getDeviceId(),
                e.getTimestamp().toString(),
                e.getEg(),
                e.getEp(),
                e.getCp(),
                e.getTp(),
                e.getEr(),
                e.getAl(),
                e.getAm(),
                e.getPf()
        );
    }
}
