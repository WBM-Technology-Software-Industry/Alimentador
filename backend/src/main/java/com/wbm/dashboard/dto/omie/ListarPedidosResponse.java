package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class ListarPedidosResponse {

    @JsonProperty("pagina")
    private Integer pagina;

    @JsonProperty("total_de_paginas")
    private Integer totalDePaginas;

    @JsonProperty("pedido_venda_produto")
    private List<PedidoVenda> pedidos;
}
