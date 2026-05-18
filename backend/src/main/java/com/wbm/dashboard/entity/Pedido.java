package com.wbm.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pedidos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Pedido {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero")
     private String numeroPedido;

    @Column(name = "numero_cliente")
    private String numeroCliente;
    private String cliente;
    private String status;
    private String prioridade;

    @Column(name = "data_entrada")
    private LocalDate dataEntrada;

    @Column(name = "data_prazo")
    private LocalDate dataPrazo;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "dados_adicionais", columnDefinition = "TEXT")
    private String dadosAdicionais;

    @Column(name = "numero_pedido_cliente")
    private String numeroPedidoCliente;

   //itens
    @OneToMany(
            mappedBy = "pedido",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER)
    @Builder.Default
    private List<PedidoItem> items = new ArrayList<>();

    //Relacionamento
    @ManyToMany(mappedBy = "pedidos")
    @JsonIgnore
    @Builder.Default
    private List<Op> ops = new ArrayList<>();

    @ManyToMany(mappedBy = "pedidos")
    @JsonIgnore
    @Builder.Default
    private List<OrdemServico> ordens = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;



}
