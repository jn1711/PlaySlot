package com.playslot.playslot;

import com.playslot.playslot.model.User;
import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.SportType;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class PlaySlotApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DatabaseHealthController databaseHealthController;

    @Autowired
    private CourtRepository courtRepository;

    @Autowired
    private CourtsController courtsController;

    @Test
    void contextLoads() {
    }

    @Test
    void savesAndFindsUserByEmail() {
        User user = userRepository.save(new User("Test User", "test@example.com", "hashed-password"));

        assertNotNull(user.getId());
        assertTrue(userRepository.existsByEmail("test@example.com"));
    }

    @Test
    void reportsDatabaseConnectionStatus() {
        assertEquals("connected", databaseHealthController.databaseHealth().status());
    }

    @Test
    void listsCourtsWithTheirPhotosAndAmenities() {
        User owner = userRepository.save(new User(
                "Court Owner",
                "court-owner@example.com",
                "hashed-password"
        ));
        courtRepository.save(new Court(
                owner,
                "Test Football Court",
                SportType.FOOTBALL,
                "Almaty",
                null,
                "Test Street 1",
                "Test description",
                new BigDecimal("7500.00"),
                List.of("/images/test-court.jpg"),
                List.of("Parking")
        ));

        List<CourtsController.CourtResponse> courts = courtsController.listCourts();

        assertEquals(1, courts.size());
        assertEquals("Test Football Court", courts.getFirst().name());
        assertEquals(SportType.FOOTBALL, courts.getFirst().sportType());
        assertEquals(List.of("/images/test-court.jpg"), courts.getFirst().photoUrls());
        assertEquals(List.of("Parking"), courts.getFirst().amenities());
    }

}
