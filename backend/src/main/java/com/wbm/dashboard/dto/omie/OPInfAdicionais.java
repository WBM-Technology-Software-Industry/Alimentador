package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class OPInfAdicionais {

    @JsonProperty("dDtInicio")
    private String dDtInicio;

    @JsonProperty("dDtConclusao")
    private String dDtConclusao;

    @JsonProperty("cEtapa")
    private String cEtapa;
}
