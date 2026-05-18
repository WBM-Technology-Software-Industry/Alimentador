package com.wbm.dashboard.service;

import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.*;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.stereotype.Service;

import java.util.Base64;

@Service
public class TotpService {

    private final DefaultSecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final DefaultCodeGenerator   codeGenerator   = new DefaultCodeGenerator();
    private final DefaultCodeVerifier    codeVerifier    =
            new DefaultCodeVerifier(codeGenerator, new SystemTimeProvider());

    public String generateSecret() {
        return secretGenerator.generate();
    }

    public String getQrImageDataUri(String email, String secret) throws QrGenerationException {
        QrData data = new QrData.Builder()
                .label(email)
                .secret(secret)
                .issuer("WBM Dashboard")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        QrGenerator generator = new ZxingPngQrGenerator();
        byte[] imageBytes = generator.generate(data);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes);
    }

    public boolean verifyCode(String secret, String code) {
        return codeVerifier.isValidCode(secret, code);
    }
}
