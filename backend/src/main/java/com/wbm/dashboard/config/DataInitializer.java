package com.wbm.dashboard.config;

import com.wbm.dashboard.entity.User;
import com.wbm.dashboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            User admin = User.builder()
                    .name("Admin")
                    .email("admin@wbm.com")
                    .password(passwordEncoder.encode("admin123"))
                    .permissao("admin")
                    .status("ativo")
                    .build();
            userRepository.save(admin);
            System.out.println("Usuário admin criado → admin@wbm.com / admin123");
        }
    }
}
