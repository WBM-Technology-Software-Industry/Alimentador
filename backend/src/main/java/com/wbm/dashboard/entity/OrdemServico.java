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
@Table(name = "ordem_servicos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrdemServico {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String numero;
    private String tipo;

    @Column(name = "op_ref")
    private String opRef;

    private String descricao;
    private String cliente;
    private String status;
    private String prioridade;
    private String responsible;
    private String sector;

    @Column(name = "data_abertura")
    private LocalDate dataAbertura;

    @Column(name = "data_prevista")
    private LocalDate dataPrevista;

    @Column(name = "iniciado_em")
    private LocalDate iniciadoEm;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @ManyToMany(fetch =  FetchType.EAGER)
    @JoinTable(
            name = "os_pedido",
            joinColumns = @JoinColumn(name = "ordem_servico_id"),
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
