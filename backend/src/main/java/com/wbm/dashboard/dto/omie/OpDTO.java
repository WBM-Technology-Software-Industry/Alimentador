package com.wbm.dashboard.dto.omie;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class OpDTO {
    private String id;
    private String numero;
    private String tipo;
    private String item;
    private String status;
    private String prioridade;
    private String responsavel;
    private String setor;
    private String abertura;
    private String prevEntrega;
    private List<String> linkedOrders;
}
