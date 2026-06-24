package com.wbm.feeder.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCrypt;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AuthTokenTest {

    // Replica a lógica de geração de token do AuthController
    private String generateToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    // Replica a lógica de verificação de senha do AuthController
    private boolean checkPassword(String raw, String hash) {
        try {
            return BCrypt.checkpw(raw, hash);
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    @DisplayName("Token gerado tem 64 caracteres hexadecimais (32 bytes)")
    void generateToken_temTamanhoCorreto() {
        String token = generateToken();
        assertThat(token).hasSize(64);
        assertThat(token).matches("[0-9a-f]+");
    }

    @RepeatedTest(10)
    @DisplayName("Tokens gerados são únicos (aleatoriedade)")
    void generateToken_saoUnicos() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            tokens.add(generateToken());
        }
        assertThat(tokens).hasSize(100);
    }

    @Test
    @DisplayName("checkPassword retorna true para senha correta")
    void checkPassword_senhaCorreta_retornaTrue() {
        String senha = "minha-senha-123";
        String hash  = BCrypt.hashpw(senha, BCrypt.gensalt());

        assertThat(checkPassword(senha, hash)).isTrue();
    }

    @Test
    @DisplayName("checkPassword retorna false para senha errada")
    void checkPassword_senhaErrada_retornaFalse() {
        String hash = BCrypt.hashpw("senha-correta", BCrypt.gensalt());

        assertThat(checkPassword("senha-errada", hash)).isFalse();
    }

    @Test
    @DisplayName("checkPassword retorna false para hash inválido (não lança exceção)")
    void checkPassword_hashInvalido_retornaFalseSemExcecao() {
        assertThat(checkPassword("qualquer", "hash-invalido")).isFalse();
    }

    @Test
    @DisplayName("BCrypt é lento por design — protege contra força bruta")
    void bcrypt_temCustoComputacional() {
        long inicio = System.currentTimeMillis();
        BCrypt.hashpw("senha", BCrypt.gensalt(10));
        long duracao = System.currentTimeMillis() - inicio;

        // BCrypt deve levar pelo menos 50ms no custo padrão (10 rounds)
        assertThat(duracao).isGreaterThan(50);
    }
}
