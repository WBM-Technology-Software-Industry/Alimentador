package com.wbm.dashboard.service;

import com.wbm.dashboard.dto.VinculoDTO;
import com.wbm.dashboard.entity.VinculoPedidoOp;
import com.wbm.dashboard.repository.VinculoPedidoOpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VinculoService {

    private final VinculoPedidoOpRepository repo;

    public List<VinculoDTO> listarTodos() {
        return repo.findAll().stream()
                .map(v -> VinculoDTO.builder()
                        .pedidoNumero(v.getPedidoNumero())
                        .opId(v.getOpId())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void vincular(String pedidoNumero, String opId) {
        if (!repo.existsByPedidoNumeroAndOpId(pedidoNumero, opId)) {
            repo.save(VinculoPedidoOp.builder()
                    .pedidoNumero(pedidoNumero)
                    .opId(opId)
                    .build());
        }
    }

    @Transactional
    public void desvincular(String pedidoNumero, String opId) {
        repo.deleteByPedidoNumeroAndOpId(pedidoNumero, opId);
    }
}
