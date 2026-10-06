package com.playslot.playslot;

import com.playslot.playslot.model.Booking;
import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.Game;
import com.playslot.playslot.model.GameStatus;
import com.playslot.playslot.model.User;
import com.playslot.playslot.model.UserRole;
import com.playslot.playslot.repository.BookingRepository;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.GameRepository;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final CourtRepository courtRepository;
    private final BookingRepository bookingRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;

    public AdminController(CourtRepository courtRepository, BookingRepository bookingRepository,
                           GameRepository gameRepository, UserRepository userRepository) {
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
        this.gameRepository = gameRepository;
        this.userRepository = userRepository;
    }

    @ModelAttribute
    public void verifyAdminRole(Authentication authentication) {
        if (authentication == null || userRepository.findByEmail(authentication.getName())
                .filter(user -> user.getRole() == UserRole.ADMIN).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Әкімші рұқсаты қажет");
        }
    }

    @GetMapping("/courts")
    @Transactional(readOnly = true)
    public List<OwnerCourtsController.CourtView> courts(
            @RequestParam(defaultValue = "PENDING") CourtStatus status) {
        return courtRepository.findByStatusOrderByCityAscNameAsc(status).stream()
                .map(OwnerCourtsController.CourtView::from).toList();
    }

    @PatchMapping("/courts/{id}/status")
    @Transactional
    public OwnerCourtsController.CourtView updateCourtStatus(@PathVariable UUID id,
                                                              @RequestBody CourtStatusRequest request) {
        Court court = courtRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        if (request == null || request.status() == null || request.status() == CourtStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Алаң күйі APPROVED немесе REJECTED болуы керек");
        }
        court.setStatus(request.status());
        return OwnerCourtsController.CourtView.from(court);
    }

    @GetMapping("/bookings")
    @Transactional(readOnly = true)
    public List<BookingsController.BookingView> bookings() {
        return bookingRepository.findAllByOrderByStartsAtDesc().stream()
                .map(BookingsController.BookingView::from).toList();
    }

    @GetMapping("/games")
    @Transactional(readOnly = true)
    public List<GamesController.GameView> games(@RequestParam(defaultValue = "PENDING") GameStatus status) {
        return gameRepository.findAllByOrderByStartsAtAsc().stream()
                .filter(game -> game.getStatus() == status)
                .map(GamesController.GameView::from).toList();
    }

    @PatchMapping("/games/{id}/status")
    @Transactional
    public GamesController.GameView updateGameStatus(@PathVariable UUID id, @RequestBody GameStatusRequest request) {
        Game game = gameRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ойын табылмады"));
        if (request == null || request.status() == null || request.status() == GameStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ойын күйі APPROVED немесе REJECTED болуы керек");
        }
        game.setStatus(request.status());
        return GamesController.GameView.from(game);
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public List<AdminUserView> users() {
        return userRepository.findAll().stream().map(AdminUserView::from).toList();
    }

    @PatchMapping("/users/{id}/role")
    @Transactional
    public AdminUserView updateUserRole(@PathVariable UUID id, @RequestBody UserRoleRequest request,
                                        Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пайдаланушы табылмады"));
        if (request == null || request.role() == null || request.role() == UserRole.ADMIN
                || user.getEmail().equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Рөл PLAYER немесе OWNER болуы керек; өз рөліңізді өзгертуге болмайды");
        }
        user.setRole(request.role());
        return AdminUserView.from(user);
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public AdminSummary summary() {
        return new AdminSummary(userRepository.count(), courtRepository.count(), bookingRepository.count(),
                gameRepository.count(),
                Arrays.stream(CourtStatus.values()).map(status -> new CourtCount(status,
                        courtRepository.countByStatus(status))).toList());
    }

    public record CourtStatusRequest(CourtStatus status) {
    }

    public record UserRoleRequest(UserRole role) {
    }

    public record GameStatusRequest(GameStatus status) {
    }

    public record AdminUserView(UUID id, String fullName, String email, UserRole role) {
        static AdminUserView from(User user) {
            return new AdminUserView(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
        }
    }

    public record CourtCount(CourtStatus status, long count) {
    }

    public record AdminSummary(long users, long courts, long bookings, long games, List<CourtCount> courtsByStatus) {
    }
}
