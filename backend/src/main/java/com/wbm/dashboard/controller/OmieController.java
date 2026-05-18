package com.wbm.dashboard.controller;

import com.wbm.dashboard.dto.omie.OpDTO;
import com.wbm.dashboard.dto.omie.PedidoSeparacaoDTO;
import com.wbm.dashboard.service.OmieService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/omie")
@RequiredArgsConstructor
public class OmieController {
    private final OmieService omieService;

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }

    @GetMapping("/pedidos-separacao")
    public ResponseEntity<List<PedidoSeparacaoDTO>> pedidosSeparacao() {
        try {
            return ResponseEntity.ok(omieService.buscarPedidosSeparacao());
        } catch (RestClientException e) {
            log.error("Erro de comunicação com a Omie (pedidos): {}", e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/ops")
    public ResponseEntity<List<OpDTO>> ops() {
        try {
            return ResponseEntity.ok(omieService.buscarOrdensProducao());
        } catch (RestClientException e) {
            log.error("Erro de comunicação com a Omie (ops): {}", e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }
}
