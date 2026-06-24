package com.wbm.feeder.service;

import com.wbm.feeder.dto.DeviceStatsDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeviceStatsServiceTest {

    @Mock JdbcTemplate jdbc;

    @InjectMocks DeviceStatsService service;

    @Test
    @DisplayName("getStats: retorna totais corretos quando há registros")
    void getStats_comRegistros_retornaTotaisCorretos() {
        Map<String, Object> row = Map.of(
                "total_tratos", 10L,
                "total_gramas", 1200L,
                "ultimo_trato", "2025-06-24T10:00:00Z"
        );
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));

        DeviceStatsDto stats = service.getStats("ALIMENTADOR_1");

        assertThat(stats.deviceId()).isEqualTo("ALIMENTADOR_1");
        assertThat(stats.totalTratos()).isEqualTo(10);
        assertThat(stats.totalGramas()).isEqualTo(1200);
        assertThat(stats.ultimoTrato()).isEqualTo("2025-06-24T10:00:00Z");
    }

    @Test
    @DisplayName("getStats: ultimoTrato é null quando não há registros")
    void getStats_semRegistros_ultimoTratoNull() {
        Map<String, Object> row = Map.of(
                "total_tratos", 0L,
                "total_gramas", 0L
                // ultimo_trato ausente = null
        );
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));

        DeviceStatsDto stats = service.getStats("ALIMENTADOR_2");

        assertThat(stats.totalTratos()).isZero();
        assertThat(stats.totalGramas()).isZero();
        assertThat(stats.ultimoTrato()).isNull();
    }

    @Test
    @DisplayName("getStats: deviceId é repassado corretamente no resultado")
    void getStats_deviceIdCorretoNoResultado() {
        Map<String, Object> row = Map.of("total_tratos", 3L, "total_gramas", 360L);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));

        DeviceStatsDto stats = service.getStats("ALIMENTADOR_2");

        assertThat(stats.deviceId()).isEqualTo("ALIMENTADOR_2");
    }
}
