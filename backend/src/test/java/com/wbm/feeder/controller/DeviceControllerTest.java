package com.wbm.feeder.controller;

import com.wbm.feeder.dto.DeviceStatsDto;
import com.wbm.feeder.model.FeedHistory;
import com.wbm.feeder.repository.*;
import com.wbm.feeder.service.DeviceStatsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeviceControllerTest {

    @Mock FeedHistoryRepository     feedHistoryRepo;
    @Mock DeviceTelemetryRepository telemetryRepo;
    @Mock DeviceScheduleRepository  scheduleRepo;
    @Mock ErrorLogRepository        errorLogRepo;
    @Mock DeviceLastSeenRepository  lastSeenRepo;
    @Mock JdbcTemplate              jdbc;
    @Mock DeviceStatsService        statsService;

    @InjectMocks DeviceController controller;

    // ─── addHistory ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("addHistory: grams = 0 retorna 400 Bad Request")
    void addHistory_gramsZero_retorna400() {
        var resp = controller.addHistory("ALIMENTADOR_1", null, Map.of("grams", 0, "source", "manual"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(feedHistoryRepo, never()).save(any());
    }

    @Test
    @DisplayName("addHistory: grams negativo retorna 400 Bad Request")
    void addHistory_gramsNegativo_retorna400() {
        var resp = controller.addHistory("ALIMENTADOR_1", null, Map.of("grams", -50, "source", "manual"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("addHistory: source=scheduled salva com userName='Sistema'")
    void addHistory_scheduled_salvaSistema() {
        FeedHistory salvo = new FeedHistory("ALIMENTADOR_1", Instant.now(), 120, "scheduled", null, "Sistema");
        when(feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(any(), anyInt(), any(), any()))
                .thenReturn(false);
        when(feedHistoryRepo.save(any())).thenReturn(salvo);

        var resp = controller.addHistory("ALIMENTADOR_1", null, Map.of("grams", 120, "source", "scheduled"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);

        ArgumentCaptor<FeedHistory> captor = ArgumentCaptor.forClass(FeedHistory.class);
        verify(feedHistoryRepo).save(captor.capture());
        assertThat(captor.getValue().getUserName()).isEqualTo("Sistema");
        assertThat(captor.getValue().getUserEmail()).isNull();
    }

    @Test
    @DisplayName("addHistory: duplicata recente retorna entrada existente sem salvar")
    void addHistory_duplicataRecente_naoSalvaNovamente() {
        FeedHistory existente = new FeedHistory("ALIMENTADOR_1", Instant.now(), 120, "manual", null, "Hitalo");
        when(feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(any(), anyInt(), any(), any()))
                .thenReturn(true);
        when(feedHistoryRepo.findByDeviceIdOrderByTimestampDesc(any(), any()))
                .thenReturn(List.of(existente));

        controller.addHistory("ALIMENTADOR_1", null, Map.of("grams", 120, "source", "manual"));

        verify(feedHistoryRepo, never()).save(any());
    }

    // ─── deleteHistoryEntry ────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteHistoryEntry: id inexistente retorna 404")
    void deleteHistoryEntry_naoEncontrado_retorna404() {
        when(feedHistoryRepo.existsById(99L)).thenReturn(false);

        var resp = controller.deleteHistoryEntry("ALIMENTADOR_1", 99L);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(feedHistoryRepo, never()).deleteById(any());
    }

    @Test
    @DisplayName("deleteHistoryEntry: id existente deleta e retorna 204")
    void deleteHistoryEntry_encontrado_retorna204() {
        when(feedHistoryRepo.existsById(1L)).thenReturn(true);

        var resp = controller.deleteHistoryEntry("ALIMENTADOR_1", 1L);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(feedHistoryRepo).deleteById(1L);
    }

    // ─── history ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("history: dispositivo sem entradas retorna lista vazia")
    void history_semEntradas_retornaListaVazia() {
        when(feedHistoryRepo.findByDeviceIdOrderByTimestampDesc(any(), any()))
                .thenReturn(List.of());

        var result = controller.history("ALIMENTADOR_1", 100);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("history: repassa limit correto para o repositório")
    void history_repassaLimitParaRepositorio() {
        when(feedHistoryRepo.findByDeviceIdOrderByTimestampDesc(any(), any()))
                .thenReturn(List.of());

        controller.history("ALIMENTADOR_1", 10);

        verify(feedHistoryRepo).findByDeviceIdOrderByTimestampDesc("ALIMENTADOR_1", PageRequest.of(0, 10));
    }

    // ─── getStats ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getStats: delega para DeviceStatsService e retorna 200")
    void getStats_delegaParaService() {
        DeviceStatsDto dto = new DeviceStatsDto("ALIMENTADOR_1", 5, 600, "2025-06-24T10:00:00Z");
        when(statsService.getStats("ALIMENTADOR_1")).thenReturn(dto);

        var resp = controller.getStats("ALIMENTADOR_1");

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isEqualTo(dto);
        verify(statsService).getStats("ALIMENTADOR_1");
    }
}
