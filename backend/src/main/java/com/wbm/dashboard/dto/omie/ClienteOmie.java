package com.wbm.dashboard.dto.omie;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ClienteOmie {

    @JsonProperty("codigo_cliente_omie")
    private Long codigoClienteOmie;

    @JsonProperty("nome_fantasia")
    private String nomeFantasia;

    @JsonProperty("razao_social")
    private String razaoSocial;

    @JsonProperty("cnpj_cpf")
    private String cnpjCpf;

    @JsonProperty("email")
    private String email;

    @JsonProperty("telefone1_ddd")
    private String telefone1Ddd;

    @JsonProperty("telefone1_numero")
    private String telefone1Numero;

    @JsonProperty("endereco")
    private String endereco;

    @JsonProperty("inativo")
    private String inativo;

}
