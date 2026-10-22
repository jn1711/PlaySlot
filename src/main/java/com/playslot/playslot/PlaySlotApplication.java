package com.playslot.playslot;

import com.playslot.playslot.model.User;
import com.playslot.playslot.model.UserRole;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class PlaySlotApplication {

    @Bean
    CommandLineRunner createAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByEmail("admin@playslot.kz")) {
                User admin = new User(
                        "Administrator",
                        "admin@playslot.kz",
                        passwordEncoder.encode("Admin12345"),
                        UserRole.ADMIN
                );

                userRepository.save(admin);
            }
        };
    }

    public static void main(String[] args) {
        SpringApplication.run(PlaySlotApplication.class, args);
    }
}
