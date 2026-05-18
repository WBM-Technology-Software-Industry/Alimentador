package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class PedidoVenda {

    @JsonProperty("cabecalho")
    private PedidoCabecalho cabecalho;

    @JsonProperty("det")
    private List<PedidoDetalhe> det;

    @JsonProperty("infoCadastro")
    private PedidoInfoCadastro infoCadastro;

    @JsonProperty("informacoes_adicionais")
    private PedidoAdicionais adicionais;
}