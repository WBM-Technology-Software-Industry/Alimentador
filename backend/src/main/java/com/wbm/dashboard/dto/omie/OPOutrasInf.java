package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class OPOutrasInf {

    @JsonProperty("cConcluida")
    private String cConcluida;

    @JsonProperty("dInclusao")
    private String dInclusao;

    @JsonProperty("uInc")
    private String uInc;
}
