package com.wbm.dashboard.controller;

import com.wbm.dashboard.entity.Pedido;
import com.wbm.dashboard.service.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class PedidoController {

    private final PedidoService pedidoService;

    @GetMapping("/entregues")
    public ResponseEntity<List<Pedido>> entregues() {
        return ResponseEntity.ok(pedidoService.listarEntregues());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        pedidoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
