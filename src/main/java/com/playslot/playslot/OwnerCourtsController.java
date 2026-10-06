package com.playslot.playslot;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.BookingStatus;
import com.playslot.playslot.model.SportType;
import com.playslot.playslot.model.User;
import com.playslot.playslot.model.UserRole;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.BookingRepository;
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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/owner/courts")
@PreAuthorize("hasRole('OWNER')")
public class OwnerCourtsController {
    private final CourtRepository courtRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    public OwnerCourtsController(CourtRepository courtRepository, BookingRepository bookingRepository,
                                 UserRepository userRepository) {
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public OwnerSummary summary(Authentication authentication) {
        User owner = currentUser(authentication);
        return new OwnerSummary(courtRepository.findByOwner_IdOrderByNameAsc(owner.getId()).size(),
                courtRepository.countByOwner_IdAndStatus(owner.getId(), CourtStatus.PENDING),
                bookingRepository.countByCourt_Owner_IdAndStatus(owner.getId(), BookingStatus.PENDING),
                bookingRepository.countByCourt_Owner_IdAndStatus(owner.getId(), BookingStatus.CONFIRMED));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CourtView> myCourts(Authentication authentication) {
        User owner = currentUser(authentication);
        return courtRepository.findByOwner_IdOrderByNameAsc(owner.getId()).stream()
                .map(CourtView::from).toList();
    }

    @PostMapping
    @Transactional
    public CourtView create(@RequestBody CourtRequest request, Authentication authentication) {
        User owner = currentUser(authentication);
        validate(request);
        Court court = new Court(owner, request.name().trim(), request.sportType(), request.city().trim(),
                clean(request.district()), request.address().trim(), clean(request.description()),
                request.hourlyPrice(), values(request.photoUrls()), values(request.amenities()));
        court.setLocation(request.latitude(), request.longitude());
        court.setWorkingHours(request.openingTime(), request.closingTime());
        court.setStatus(CourtStatus.PENDING);
        return CourtView.from(courtRepository.save(court));
    }

    @PutMapping("/{id}")
    @Transactional
    public CourtView update(@PathVariable UUID id, @RequestBody CourtRequest request,
                            Authentication authentication) {
        User owner = currentUser(authentication);
        Court court = courtRepository.findById(id)
                .filter(item -> item.getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        validate(request);
        court.updateDetails(request.name().trim(), request.sportType(), request.city().trim(),
                clean(request.district()), request.address().trim(), clean(request.description()),
                request.hourlyPrice(), values(request.photoUrls()), values(request.amenities()));
        court.setLocation(request.latitude(), request.longitude());
        court.setWorkingHours(request.openingTime(), request.closingTime());
        court.setStatus(CourtStatus.PENDING);
        return CourtView.from(court);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .filter(user -> user.getRole() == UserRole.OWNER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Иесіне рұқсат қажет"));
    }

    private static void validate(CourtRequest request) {
        if (request == null || blank(request.name()) || request.name().trim().length() > 150
                || request.sportType() == null || blank(request.city()) || request.city().trim().length() > 100
                || blank(request.address()) || request.address().trim().length() > 255
                || request.hourlyPrice() == null || request.hourlyPrice().signum() <= 0
                || request.hourlyPrice().precision() > 10 || request.hourlyPrice().scale() > 2
                || (request.district() != null && request.district().length() > 100)
                || (request.latitude() == null) != (request.longitude() == null)
                || (request.latitude() != null && (request.latitude().compareTo(BigDecimal.valueOf(-90)) < 0
                || request.latitude().compareTo(BigDecimal.valueOf(90)) > 0
                || request.latitude().scale() > 6 || request.latitude().precision() > 9
                || request.longitude().compareTo(BigDecimal.valueOf(-180)) < 0
                || request.longitude().compareTo(BigDecimal.valueOf(180)) > 0
                || request.longitude().scale() > 6 || request.longitude().precision() > 9))
                || ((request.openingTime() == null) != (request.closingTime() == null))
                || (request.openingTime() != null && !request.openingTime().isBefore(request.closingTime()))
                || (request.description() != null && request.description().length() > 10_000)
                || !validValues(request.photoUrls(), 12, 2048)
                || !validValues(request.amenities(), 50, 100)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Алаң деректері қате");
        }
    }

    private static boolean validValues(List<String> values, int maxCount, int maxLength) {
        return values == null || (values.size() <= maxCount
                && values.stream().allMatch(value -> value != null && !value.isBlank()
                && value.length() <= maxLength));
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static List<String> values(List<String> values) {
        return values == null ? List.of() : List.copyOf(values);
    }

    public record CourtRequest(String name, SportType sportType, String city, String district,
                               BigDecimal latitude, BigDecimal longitude, String address,
                               String description, BigDecimal hourlyPrice, LocalTime openingTime,
                               LocalTime closingTime, List<String> photoUrls,
                               List<String> amenities) {
    }

    public record OwnerSummary(long courts, long courtsPendingModeration,
                               long pendingBookings, long confirmedBookings) {
    }

    public record CourtView(UUID id, String name, SportType sportType, String city, String district,
                            BigDecimal latitude, BigDecimal longitude, String address, String description,
                            BigDecimal hourlyPrice, LocalTime openingTime, LocalTime closingTime,
                            List<String> photoUrls, List<String> amenities, CourtStatus status) {
        static CourtView from(Court court) {
            return new CourtView(court.getId(), court.getName(), court.getSportType(), court.getCity(),
                    court.getDistrict(), court.getLatitude(), court.getLongitude(), court.getAddress(),
                    court.getDescription(), court.getHourlyPrice(), court.getOpeningTime(), court.getClosingTime(),
                    court.getPhotoUrls(), court.getAmenities(), court.getStatus());
        }
    }
}
