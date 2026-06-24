package com.wbm.feeder.service;

import com.wbm.feeder.dto.DeviceStatsDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class DeviceStatsService {
    private final JdbcTemplate jdbc;

    public DeviceStatsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public DeviceStatsDto getStats(String deviceId) {
        var rows = jdbc.queryForList("""
                SELECT
                    COUNT(*)                AS total_tratos,
                    COALESCE(SUM(grams), 0) AS total_gramas,
                    MAX(timestamp)          AS ultimo_trato
                FROM feed_history
                WHERE device_id = ?
                  AND source    != 'cancelled'
                """, deviceId);

        Map<String, Object> row = rows.get(0);
        long totalTratos = ((Number) row.get("total_tratos")).longValue();
        long totalGramas = ((Number) row.get("total_gramas")).longValue();
        Object ts        = row.get("ultimo_trato");
        String ultimo    = ts != null ? ts.toString() : null;

        return new DeviceStatsDto(deviceId, totalTratos, totalGramas, ultimo);

    }
}