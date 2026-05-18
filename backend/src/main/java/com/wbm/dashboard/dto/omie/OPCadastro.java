package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class OPCadastro {

    @JsonProperty("identificacao")
    private OPIdentificacao identificacao;

    @JsonProperty("infAdicionais")
    private OPInfAdicionais infAdicionais;

    @JsonProperty("outrasInf")
    private OPOutrasInf outrasInf;
}
