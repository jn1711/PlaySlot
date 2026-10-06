package com.playslot.playslot;

import com.playslot.playslot.model.User;
import com.playslot.playslot.repository.BookingRepository;
import com.playslot.playslot.repository.GameRepository;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final GameRepository gameRepository;

    public ProfileController(UserRepository userRepository, BookingRepository bookingRepository,
                             GameRepository gameRepository) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.gameRepository = gameRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ProfileView profile(Authentication authentication) {
        User user = currentUser(authentication);
        List<BookingsController.BookingView> bookings =
                bookingRepository.findByUser_IdOrderByStartsAtDesc(user.getId()).stream()
                        .map(BookingsController.BookingView::from).toList();
        List<GamesController.GameView> games = gameRepository.findByParticipants_IdOrderByStartsAtDesc(user.getId())
                .stream().map(GamesController.GameView::from).toList();
        return new ProfileView(user.getId(), user.getFullName(), user.getEmail(), user.getRole(),
                bookings, games);
    }

    @PutMapping
    @Transactional
    public UserView update(@RequestBody ProfileRequest request, Authentication authentication) {
        if (request == null || request.fullName() == null || request.fullName().isBlank()
                || request.fullName().trim().length() > 150) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Аты-жөніңізді дұрыс енгізіңіз");
        }
        User user = currentUser(authentication);
        user.updateProfile(request.fullName().trim());
        return UserView.from(user);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Кіру қажет"));
    }

    public record ProfileRequest(String fullName) {
    }

    public record UserView(UUID id, String fullName, String email, com.playslot.playslot.model.UserRole role) {
        static UserView from(User user) {
            return new UserView(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
        }
    }

    public record ProfileView(UUID id, String fullName, String email,
                              com.playslot.playslot.model.UserRole role,
                              List<BookingsController.BookingView> bookings,
                              List<GamesController.GameView> games) {
    }
}
