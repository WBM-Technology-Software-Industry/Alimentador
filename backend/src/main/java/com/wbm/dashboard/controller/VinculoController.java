package com.wbm.dashboard.controller;

import com.wbm.dashboard.dto.VinculoDTO;
import com.wbm.dashboard.service.VinculoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vinculos")
@RequiredArgsConstructor
public class VinculoController {

    private final VinculoService service;

    @GetMapping
    public ResponseEntity<List<VinculoDTO>> listar() {
        return ResponseEntity.ok(service.listarTodos());
    }

    @PostMapping
    public ResponseEntity<Void> vincular(@RequestBody VinculoDTO dto) {
        service.vincular(dto.getPedidoNumero(), dto.getOpId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{pedidoNumero}/{opId}")
    public ResponseEntity<Void> desvincular(
            @PathVariable String pedidoNumero,
            @PathVariable String opId) {
        service.desvincular(pedidoNumero, opId);
        return ResponseEntity.noContent().build();
    }
}
