package com.wbm.dashboard.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "vinculos_pedido_op",
    uniqueConstraints = @UniqueConstraint(columnNames = {"pedido_numero", "op_id"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VinculoPedidoOp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pedido_numero", nullable = false)
    private String pedidoNumero;

    @Column(name = "op_id", nullable = false)
    private String opId;
}
