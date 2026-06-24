package com.wbm.feeder.dto;

import com.wbm.feeder.model.FeedHistory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class FeedHistoryDtoTest {

    @Test
    @DisplayName("from() mapeia todos os campos corretamente")
    void from_mapeiaCorretamente() {
        FeedHistory entity = new FeedHistory(
                "ALIMENTADOR_1",
                Instant.parse("2025-06-24T10:00:00Z"),
                150,
                "manual",
                "hitalo@wbm.com",
                "Hitalo"
        );

        FeedHistoryDto dto = FeedHistoryDto.from(entity);

        assertThat(dto.deviceId()).isEqualTo("ALIMENTADOR_1");
        assertThat(dto.grams()).isEqualTo(150);
        assertThat(dto.source()).isEqualTo("manual");
        assertThat(dto.userEmail()).isEqualTo("hitalo@wbm.com");
        assertThat(dto.userName()).isEqualTo("Hitalo");
        assertThat(dto.timestamp()).isEqualTo("2025-06-24T10:00:00Z");
    }

    @Test
    @DisplayName("from() retorna grams=0 quando FeedHistory tem grams null")
    void from_gramsNulo_retornaZero() {
        FeedHistory entity = new FeedHistory(
                "ALIMENTADOR_2",
                Instant.now(),
                null,  // grams nulo
                "scheduled",
                null,
                "Sistema"
        );

        FeedHistoryDto dto = FeedHistoryDto.from(entity);

        assertThat(dto.grams()).isEqualTo(0);
    }

    @Test
    @DisplayName("from() aceita userEmail e userName nulos")
    void from_camposNulos_naoLancaExcecao() {
        FeedHistory entity = new FeedHistory(
                "ALIMENTADOR_1",
                Instant.now(),
                200,
                "scheduled",
                null,
                null
        );

        FeedHistoryDto dto = FeedHistoryDto.from(entity);

        assertThat(dto.userEmail()).isNull();
        assertThat(dto.userName()).isNull();
    }
}
