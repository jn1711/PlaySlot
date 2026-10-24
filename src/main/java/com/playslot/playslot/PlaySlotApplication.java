package com.playslot.playslot;

import com.playslot.playslot.model.User;
import com.playslot.playslot.model.UserRole;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;

@SpringBootApplication
public class PlaySlotApplication {

    @Bean
    CommandLineRunner createAdmin(UserRepository userRepository,
                                  PasswordEncoder passwordEncoder,
                                  @Value("${ADMIN_EMAIL:}") String adminEmail,
                                  @Value("${ADMIN_PASSWORD:}") String adminPassword) {
        return args -> {
            if (adminEmail.isBlank() || adminPassword.isBlank()) return;
            if (!userRepository.existsByEmail(adminEmail)) {
                userRepository.save(new User("Administrator", adminEmail,
                        passwordEncoder.encode(adminPassword), UserRole.ADMIN));
            }
        };
    }

    public static void main(String[] args) {
        SpringApplication.run(PlaySlotApplication.class, args);
    }
}
