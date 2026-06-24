package com.wbm.feeder.controller;

import com.wbm.feeder.dto.DeviceStatsDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DeviceStatsTest {

    private DeviceStatsDto buildStats(long tratos, long gramas, String ultimo) {
        return new DeviceStatsDto("ALIMENTADOR_1", tratos, gramas, ultimo);
    }

    @Test
    @DisplayName("Stats com tratos retorna valores corretos")
    void stats_comTratos_retornaValoresCorretos() {
        DeviceStatsDto stats = buildStats(10, 1200, "2025-06-24T10:00:00Z");

        assertThat(stats.deviceId()).isEqualTo("ALIMENTADOR_1");
        assertThat(stats.totalTratos()).isEqualTo(10);
        assertThat(stats.totalGramas()).isEqualTo(1200);
        assertThat(stats.ultimoTrato()).isEqualTo("2025-06-24T10:00:00Z");
    }

    @Test
    @DisplayName("Stats sem nenhum trato retorna zeros e ultimotrato null")
    void stats_semTratos_retornaZerosEultimoNull() {
        DeviceStatsDto stats = buildStats(0,0,null);

        assertThat(stats.totalTratos()).isZero();
        assertThat(stats.totalGramas()).isZero();
        assertThat(stats.ultimoTrato()).isNull();
    }

    @Test
    @DisplayName("Média de gramas por trato calculada corretamente")
    void stats_mediaGramas_calculadaCorretamente() {
        DeviceStatsDto stats = buildStats(5, 600, "2025-06-24T10:00:00Z");

        long media = stats.totalGramas() / stats.totalTratos();
        assertThat(media).isEqualTo(120);
    }

}