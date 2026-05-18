package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@NoArgsConstructor
public class OPIdentificacao {

    @JsonProperty("nCodOP")
    private Long nCodOP;

    @JsonProperty("cCodIntOP")
    private String cCodIntOP;

    @JsonProperty("cNumOP")
    private String cNumOP;

    @JsonProperty("nCodProduto")
    private Long nCodProduto;

    @JsonProperty("cCodIntProd")
    private String cCodIntProd;

    @JsonProperty("dDtPrevisao")
    private String dDtPrevisao;

    @JsonProperty("nQtde")
    private BigDecimal nQtde;
}
