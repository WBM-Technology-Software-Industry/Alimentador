package com.wbm.dashboard.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    @Async
    public void sendOtp(String to, String code) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");

            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Código de verificação – WBM Dashboard");
            helper.setText(buildHtml(code), true);

            mailSender.send(msg);
            log.info("OTP enviado para {}", to);
        } catch (MessagingException e) {
            log.error("Falha ao enviar OTP para {}: {}", to, e.getMessage());
            log.warn(">>> OTP para {} (fallback console): {}", to, code);
        } catch (Exception e) {
            log.error("Falha ao enviar OTP para {}: {}", to, e.getMessage());
            log.warn(">>> OTP para {} (fallback console): {}", to, code);
        }
    }

    private String buildHtml(String code) {
        return """
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff">
              <img src="https://wbmtechnology.com.br/wp-content/uploads/2024/10/logo041.png"
                   alt="WBM Technology" style="height:48px;margin-bottom:24px"/>
              <h2 style="margin:0 0 8px;font-size:20px;color:#111">Verificação de dois fatores</h2>
              <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6">
                Use o código abaixo para concluir o seu acesso ao WBM Dashboard.
                Ele é válido por <strong>10 minutos</strong>.
              </p>
              <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
                <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#111;font-family:monospace">%s</span>
              </div>
              <p style="margin:0;color:#999;font-size:12px">
                Se você não tentou acessar o sistema, ignore este e-mail.
              </p>
            </div>
            """.formatted(code);
    }
}
