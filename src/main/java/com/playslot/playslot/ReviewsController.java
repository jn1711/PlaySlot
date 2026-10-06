package com.playslot.playslot;

import com.playslot.playslot.model.BookingStatus;
import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.Review;
import com.playslot.playslot.model.User;
import com.playslot.playslot.repository.BookingRepository;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.ReviewRepository;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courts/{courtId}/reviews")
public class ReviewsController {
    private final ReviewRepository reviewRepository;
    private final CourtRepository courtRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    public ReviewsController(ReviewRepository reviewRepository, CourtRepository courtRepository,
                             UserRepository userRepository, BookingRepository bookingRepository) {
        this.reviewRepository = reviewRepository;
        this.courtRepository = courtRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ReviewView> reviews(@PathVariable UUID courtId) {
        courtRepository.findById(courtId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        return reviewRepository.findByCourt_IdOrderByCreatedAtDesc(courtId).stream()
                .map(ReviewView::from).toList();
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public RatingSummary summary(@PathVariable UUID courtId) {
        courtRepository.findById(courtId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        return new RatingSummary(reviewRepository.averageRatingForCourt(courtId),
                reviewRepository.countByCourt_Id(courtId));
    }

    @PostMapping
    @Transactional
    public ReviewView create(@PathVariable UUID courtId, @RequestBody ReviewRequest request,
                             Authentication authentication) {
        if (request == null || request.rating() < 1 || request.rating() > 5
                || (request.comment() != null && request.comment().length() > 5000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Пікір немесе рейтинг қате");
        }
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Кіру қажет"));
        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        if (!bookingRepository.existsByUser_IdAndCourt_IdAndStatus(user.getId(), courtId, BookingStatus.COMPLETED)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Пікір қалдыру үшін брондау аяқталуы керек");
        }
        if (reviewRepository.existsByUser_IdAndCourt_Id(user.getId(), courtId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Бұл алаңға пікір қалдырылған");
        }
        Review review = reviewRepository.save(new Review(user, court, request.rating(), request.comment()));
        return ReviewView.from(review);
    }

    public record ReviewRequest(int rating, String comment) {
    }

    public record RatingSummary(Double averageRating, long reviewCount) {
    }

    public record ReviewView(UUID id, UUID courtId, String author, int rating,
                             String comment, LocalDateTime createdAt) {
        static ReviewView from(Review review) {
            return new ReviewView(review.getId(), review.getCourt().getId(), review.getUser().getFullName(),
                    review.getRating(), review.getComment(), review.getCreatedAt());
        }
    }
}
