package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PedidoInfoCadastro {

    @JsonProperty("faturado")
    private String faturado;

    @JsonProperty("cancelado")
    private String cancelado;

    @JsonProperty("dInc")
    private String dataInclusao;
}
