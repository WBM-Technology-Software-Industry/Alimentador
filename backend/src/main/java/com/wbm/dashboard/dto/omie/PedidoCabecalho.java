package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PedidoCabecalho {

        @JsonProperty("codigo_pedido")
        private Long codigoPedido;

        @JsonProperty("numero_pedido")
        private String numeroPedido;

        @JsonProperty("codigo_cliente")
        private Long codigoCliente;

        @JsonProperty("etapa")
        private String etapa;

        @JsonProperty("data_previsao")
        private String dataPrevisao;
}