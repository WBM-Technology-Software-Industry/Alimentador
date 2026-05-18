package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PedidoProduto {

    @JsonProperty("descricao")
    private String descricao;

    @JsonProperty("quantidade")
    private Double quantidade;

    @JsonProperty("valor_unitario")
    private Double valorUnitario;

    @JsonProperty("valor_total")
    private Double valorTotal;

    @JsonProperty("unidade")
    private String unidade;
}
