package com.wbm.dashboard.dto.omie;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PedidoSeparacaoDTO {

    private String numeroPedido;
    private String numeroPedidoCliente;
    private String nomeCliente;
    private List<String> itens;
    private String dataEntrada;
    private String dataPrazo;
    private String status;
    private String dadosAdicionais;
}
