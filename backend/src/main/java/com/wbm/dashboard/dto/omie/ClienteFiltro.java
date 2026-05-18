package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ClienteFiltro {
    @JsonProperty("pagina")
    private Integer pagina;

    @JsonProperty("registros_por_pagina")
    private Integer registrosPorPagina;
}
