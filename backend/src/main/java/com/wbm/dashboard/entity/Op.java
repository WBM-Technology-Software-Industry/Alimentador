package com.wbm.dashboard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ops")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Op {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String numero;
    private String item;
    private String responsavel;
    private String setor;
    private String prioridade;
    private String status;
    private LocalDate abertura;

    @Column(name = "prev_entrega")
    private LocalDate prevEntrega;

    //Relacionamento
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "op_pedido",
            joinColumns = @JoinColumn(name = "op_id"),
            inverseJoinColumns = @JoinColumn(name = "pedido_id")
    )
    private List<Pedido> pedidos = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

}
