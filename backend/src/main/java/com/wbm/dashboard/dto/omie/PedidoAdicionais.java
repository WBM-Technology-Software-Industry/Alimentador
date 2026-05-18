package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PedidoAdicionais {

    @JsonProperty("numero_pedido_cliente")
    private String numeroPedidoCliente;

    @JsonProperty("dados_adicionais_nf")
    private String dadosAdicionaisNf;
}
