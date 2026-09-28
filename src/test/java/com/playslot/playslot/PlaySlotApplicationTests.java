package com.playslot.playslot;

import com.playslot.playslot.model.User;
import com.playslot.playslot.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class PlaySlotApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Test
    void contextLoads() {
    }

    @Test
    void savesAndFindsUserByEmail() {
        User user = userRepository.save(new User("Test User", "test@example.com", "hashed-password"));

        assertNotNull(user.getId());
        assertTrue(userRepository.existsByEmail("test@example.com"));
    }

}
