package com.playslot.playslot;

import com.playslot.playslot.model.Booking;
import com.playslot.playslot.model.BookingStatus;
import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.User;
import com.playslot.playslot.repository.BookingRepository;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
public class BookingsController {
    private static final List<BookingStatus> ACTIVE_STATUSES =
            List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED);

    private final BookingRepository bookingRepository;
    private final CourtRepository courtRepository;
    private final UserRepository userRepository;

    public BookingsController(BookingRepository bookingRepository, CourtRepository courtRepository,
                              UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.courtRepository = courtRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/api/bookings")
    @PreAuthorize("hasAnyRole('PLAYER', 'OWNER')")
    @Transactional
    public BookingView create(@RequestBody BookingRequest request, Authentication authentication) {
        if (request == null || request.courtId() == null || request.startsAt() == null || request.endsAt() == null
                || !request.startsAt().isAfter(LocalDateTime.now()) || !request.endsAt().isAfter(request.startsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Брондау уақыты қате");
        }
        Court court = courtRepository.findByIdForUpdate(request.courtId())
                .filter(item -> item.getStatus() == CourtStatus.APPROVED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        if (!request.startsAt().toLocalDate().equals(request.endsAt().toLocalDate())
                || request.startsAt().toLocalTime().isBefore(court.getOpeningTime())
                || request.endsAt().toLocalTime().isAfter(court.getClosingTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Уақыт алаңның жұмыс кестесінен тыс");
        }
        User user = currentUser(authentication);
        if (bookingRepository.existsOverlappingBooking(court.getId(), request.startsAt(), request.endsAt(),
                ACTIVE_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Бұл уақыт бос емес");
        }
        Booking booking = bookingRepository.save(new Booking(user, court, request.startsAt(), request.endsAt()));
        return BookingView.from(booking);
    }

    @GetMapping("/api/bookings/mine")
    @Transactional(readOnly = true)
    public List<BookingView> myBookings(Authentication authentication) {
        User user = currentUser(authentication);
        return bookingRepository.findByUser_IdOrderByStartsAtDesc(user.getId()).stream()
                .map(BookingView::from).toList();
    }

    @GetMapping("/api/courts/{courtId}/availability")
    @Transactional(readOnly = true)
    public List<TimeSlot> availability(@PathVariable UUID courtId, @RequestParam LocalDate date) {
        courtRepository.findById(courtId)
                .filter(court -> court.getStatus() == CourtStatus.APPROVED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        return bookingRepository.findByCourt_IdAndStatusInAndStartsAtBeforeAndEndsAtAfter(
                        courtId, ACTIVE_STATUSES, end, start).stream()
                .map(TimeSlot::from)
                .toList();
    }

    @GetMapping("/api/owner/bookings")
    @PreAuthorize("hasRole('OWNER')")
    @Transactional(readOnly = true)
    public List<BookingView> ownerBookings(Authentication authentication) {
        User owner = currentUser(authentication);
        return bookingRepository.findByCourt_Owner_IdOrderByStartsAtDesc(owner.getId()).stream()
                .map(BookingView::from).toList();
    }

    @PutMapping("/api/bookings/{id}/status")
    @Transactional
    public BookingView updateStatus(@PathVariable UUID id, @RequestBody StatusRequest request,
                                    Authentication authentication) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Брондау табылмады"));
        User user = currentUser(authentication);
        boolean owner = booking.getCourt().getOwner().getId().equals(user.getId());
        boolean admin = user.getRole().name().equals("ADMIN");
        boolean player = booking.getUser().getId().equals(user.getId());
        if (!(owner || admin || player) || request == null || request.status() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Брондауды өзгертуге рұқсат жоқ");
        }
        if (player && !owner && !admin && request.status() != BookingStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Пайдаланушы тек брондауды болдырмай алады");
        }
        if (owner && !admin && request.status() != BookingStatus.CONFIRMED
                && request.status() != BookingStatus.CANCELLED
                && request.status() != BookingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Бұл брондау күйіне ауысу мүмкін емес");
        }
        if (owner && !admin && request.status() == BookingStatus.CONFIRMED
                && booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Тек жаңа брондауды растауға болады");
        }
        if (owner && !admin && request.status() == BookingStatus.COMPLETED
                && (booking.getStatus() != BookingStatus.CONFIRMED
                || booking.getEndsAt().isAfter(LocalDateTime.now()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Аяқталмаған брондауды жабуға болмайды");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Брондау жабылған");
        }
        booking.setStatus(request.status());
        return BookingView.from(booking);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Кіру қажет"));
    }

    public record BookingRequest(UUID courtId, LocalDateTime startsAt, LocalDateTime endsAt) {
    }

    public record StatusRequest(BookingStatus status) {
    }

    public record TimeSlot(UUID bookingId, LocalDateTime startsAt, LocalDateTime endsAt,
                           BookingStatus status) {
        static TimeSlot from(Booking booking) {
            return new TimeSlot(booking.getId(), booking.getStartsAt(), booking.getEndsAt(), booking.getStatus());
        }
    }

    public record BookingView(UUID id, UUID courtId, String courtName, UUID userId, String userName,
                              LocalDateTime startsAt, LocalDateTime endsAt, BookingStatus status) {
        static BookingView from(Booking booking) {
            return new BookingView(booking.getId(), booking.getCourt().getId(), booking.getCourt().getName(),
                    booking.getUser().getId(), booking.getUser().getFullName(), booking.getStartsAt(),
                    booking.getEndsAt(), booking.getStatus());
        }
    }
}
