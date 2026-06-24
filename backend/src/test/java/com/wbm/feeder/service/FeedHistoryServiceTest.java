package com.wbm.feeder.service;

import com.wbm.feeder.model.FeedHistory;
import com.wbm.feeder.repository.FeedHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedHistoryServiceTest {

    @Mock
    private FeedHistoryRepository feedHistoryRepo;

    @InjectMocks
    private FeedHistoryService service;

    @BeforeEach
    void setUp() {
        // Mockito injeta o repositório mock automaticamente via @InjectMocks
    }

    @Test
    @DisplayName("Salva registro quando não existe entrada recente")
    void saveIfNew_quandoNaoExisteEntradaRecente_salvaNoBanco() {
        // Arrange: repositório retorna false (não existe duplicata)
        when(feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(
                anyString(), anyInt(), anyString(), any(Instant.class)))
                .thenReturn(false);

        // Act
        service.saveIfNew("ALIMENTADOR_1", 120, "scheduled");

        // Assert: deve ter chamado save() exatamente uma vez
        ArgumentCaptor<FeedHistory> captor = ArgumentCaptor.forClass(FeedHistory.class);
        verify(feedHistoryRepo, times(1)).save(captor.capture());

        FeedHistory salvo = captor.getValue();
        assertThat(salvo.getDeviceId()).isEqualTo("ALIMENTADOR_1");
        assertThat(salvo.getGrams()).isEqualTo(120);
        assertThat(salvo.getSource()).isEqualTo("scheduled");
        assertThat(salvo.getUserName()).isEqualTo("Sistema");
    }

    @Test
    @DisplayName("Ignora registro duplicado nos últimos 2 minutos")
    void saveIfNew_quandoExisteDuplicataRecente_naoSalva() {
        // Arrange: repositório retorna true (já existe registro recente)
        when(feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(
                anyString(), anyInt(), anyString(), any(Instant.class)))
                .thenReturn(true);

        // Act
        service.saveIfNew("ALIMENTADOR_1", 120, "scheduled");

        // Assert: save() nunca deve ser chamado
        verify(feedHistoryRepo, never()).save(any());
    }

    @Test
    @DisplayName("Dispositivos diferentes não interferem na deduplicação")
    void saveIfNew_dispositivosDiferentes_ambosPodemSalvar() {
        when(feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(
                anyString(), anyInt(), anyString(), any(Instant.class)))
                .thenReturn(false);

        service.saveIfNew("ALIMENTADOR_1", 100, "scheduled");
        service.saveIfNew("ALIMENTADOR_2", 100, "scheduled");

        verify(feedHistoryRepo, times(2)).save(any());
    }
}
