package com.wbm.dashboard.repository;

import com.wbm.dashboard.entity.VinculoPedidoOp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VinculoPedidoOpRepository extends JpaRepository<VinculoPedidoOp, Long> {
    List<VinculoPedidoOp> findByPedidoNumero(String pedidoNumero);
    List<VinculoPedidoOp> findByOpId(String opId);
    boolean existsByPedidoNumeroAndOpId(String pedidoNumero, String opId);
    void deleteByPedidoNumeroAndOpId(String pedidoNumero, String opId);
}
