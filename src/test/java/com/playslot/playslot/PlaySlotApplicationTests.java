package com.playslot.playslot;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.Review;
import com.playslot.playslot.model.User;
import com.playslot.playslot.model.UserRole;
import com.playslot.playslot.model.SportType;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.ReviewRepository;
import com.playslot.playslot.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static com.jayway.jsonpath.JsonPath.read;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class PlaySlotApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DatabaseHealthController databaseHealthController;

    @Autowired
    private CourtRepository courtRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ReviewsController reviewsController;

    @Autowired
    private CourtsController courtsController;

    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @BeforeEach
    void setUpMockMvc() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

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

        List<CourtsController.CourtResponse> courts =
                courtsController.listCourts(null, null, null, null, null, "Test Football Court");

        assertEquals(1, courts.size());
        assertEquals("Test Football Court", courts.getFirst().name());
        assertEquals(SportType.FOOTBALL, courts.getFirst().sportType());
        assertEquals(List.of("/images/test-court.jpg"), courts.getFirst().photoUrls());
        assertEquals(List.of("Parking"), courts.getFirst().amenities());
    }

    @Test
    void registersUserWithHashedPasswordAndRejectsDuplicateEmail() throws Exception {
        String email = "new-user@example.com";
        Cookie csrfCookie = csrfCookie();
        String request = """
                {"fullName":"New User","email":"%s","password":"strong-password"}
                """.formatted(email);

        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        User savedUser = userRepository.findByEmail(email).orElseThrow();
        assertTrue(passwordEncoder.matches("strong-password", savedUser.getPasswordHash()));

        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void loginCreatesSessionAndExposesOnlyPublicUserDetails() throws Exception {
        String email = "login-user@example.com";
        Cookie csrfCookie = csrfCookie();
        userRepository.save(new User("Login User", email, passwordEncoder.encode("strong-password")));

        MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"strong-password"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn()
                .getRequest()
                .getSession(false);

        assertNotNull(session);
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Login User"))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void logoutInvalidatesSessionAndApiRootListsEndpoints() throws Exception {
        String email = "logout-user@example.com";
        userRepository.save(new User("Logout User", email, passwordEncoder.encode("strong-password")));
        Cookie csrfCookie = csrfCookie();

        MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"strong-password"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
        assertNotNull(session);

        mockMvc.perform(post("/api/auth/logout")
                        .session(session)
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("logged_out"));

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("PlaySlot API"))
                .andExpect(jsonPath("$.endpoints").isArray());
        mockMvc.perform(get("/index.html"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/login.html"))
                .andExpect(status().isNotFound());
    }

    @Test
    void loginRejectsInvalidPassword() throws Exception {
        String email = "wrong-password@example.com";
        Cookie csrfCookie = csrfCookie();
        userRepository.save(new User("Login User", email, passwordEncoder.encode("strong-password")));

        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"wrong-password"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void registrationRejectsShortPasswords() throws Exception {
        Cookie csrfCookie = csrfCookie();
        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Short Password","email":"short-password@example.com","password":"short"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void csrfProtectedRegistrationRejectsRequestsWithoutToken() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"No Token","email":"no-token@example.com","password":"strong-password"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerCanSubmitCourtForModerationButItIsNotPublicYet() throws Exception {
        String email = "owner-" + java.util.UUID.randomUUID() + "@example.com";
        Cookie csrfCookie = csrfCookie();
        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Court Owner","email":"%s","password":"strong-password","role":"OWNER"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("OWNER"));

        MockHttpSession session = login(email, csrfCookie);
        String courtId = read(mockMvc.perform(post("/api/owner/courts")
                        .session(session)
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Moderation Court","sportType":"FOOTBALL","city":"Almaty",
                                 "address":"Main street 1","hourlyPrice":7500}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/courts").param("search", "Moderation Court"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        String adminEmail = "admin-" + java.util.UUID.randomUUID() + "@example.com";
        userRepository.save(new User("Admin", adminEmail, passwordEncoder.encode("strong-password"),
                UserRole.ADMIN));
        MockHttpSession adminSession = login(adminEmail, csrfCookie);
        mockMvc.perform(patch("/api/admin/courts/" + courtId + "/status")
                        .session(adminSession)
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"APPROVED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
        mockMvc.perform(get("/api/courts").param("search", "Moderation Court"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Moderation Court"));
        courtRepository.findById(java.util.UUID.fromString(courtId)).orElseThrow()
                .setStatus(CourtStatus.PENDING);
        courtRepository.flush();
    }

    @Test
    void overlappingBookingsAreRejectedAndAvailabilityShowsPendingSlots() throws Exception {
        String email = "player-" + java.util.UUID.randomUUID() + "@example.com";
        userRepository.save(new User("Booking Player", email, passwordEncoder.encode("strong-password")));
        User owner = userRepository.save(new User("Booking Owner",
                "court-" + java.util.UUID.randomUUID() + "@example.com", "hashed-password", UserRole.OWNER));
        Court court = courtRepository.save(new Court(owner, "Available Court", SportType.FOOTBALL,
                "Almaty", null, "Test street 2", "Test", new BigDecimal("6000"),
                List.of(), List.of()));
        Cookie csrfCookie = csrfCookie();
        MockHttpSession session = login(email, csrfCookie);
        LocalDateTime start = LocalDateTime.now().plusDays(2).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusHours(1);

        mockMvc.perform(post("/api/bookings")
                        .session(session)
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"courtId":"%s","startsAt":"%s","endsAt":"%s"}
                                """.formatted(court.getId(), start, end)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(post("/api/bookings")
                        .session(session)
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"courtId":"%s","startsAt":"%s","endsAt":"%s"}
                                """.formatted(court.getId(), start.plusMinutes(30), end.plusHours(1))))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/courts/" + court.getId() + "/availability")
                        .param("date", start.toLocalDate().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
        courtRepository.findById(court.getId()).orElseThrow()
                .setStatus(CourtStatus.PENDING);
        courtRepository.flush();
    }

    @Test
    void reviewModuleReturnsCourtRatingSummary() {
        User reviewer = userRepository.save(new User("Reviewer",
                "reviewer-" + java.util.UUID.randomUUID() + "@example.com", "hashed-password"));
        Court court = courtRepository.save(new Court(reviewer, "Review Court", SportType.TENNIS,
                "Almaty", null, "Review street 1", "Test", new BigDecimal("5000"),
                List.of(), List.of()));
        reviewRepository.save(new Review(reviewer, court, 4, "Good court"));

        ReviewsController.RatingSummary summary = reviewsController.summary(court.getId());

        assertEquals(4.0, summary.averageRating());
        assertEquals(1, summary.reviewCount());
    }

    private MockHttpSession login(String email, Cookie csrfCookie) throws Exception {
        MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"strong-password"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
        assertNotNull(session);
        return session;
    }

    private Cookie csrfCookie() throws Exception {
        Cookie cookie = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse()
                .getCookie("XSRF-TOKEN");
        assertNotNull(cookie);
        return cookie;
    }

}
