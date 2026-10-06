package com.playslot.playslot.repository;

import com.playslot.playslot.model.Booking;
import com.playslot.playslot.model.BookingStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByUser_IdOrderByStartsAtDesc(UUID userId);
    List<Booking> findByCourt_IdAndStatus(UUID courtId, BookingStatus status);
    List<Booking> findByCourt_IdAndStatusInAndStartsAtBeforeAndEndsAtAfter(
            UUID courtId, List<BookingStatus> statuses, java.time.LocalDateTime endsAt,
            java.time.LocalDateTime startsAt);
    List<Booking> findByCourt_Owner_IdOrderByStartsAtDesc(UUID ownerId);
    List<Booking> findAllByOrderByStartsAtDesc();
    boolean existsByUser_IdAndCourt_IdAndStatus(UUID userId, UUID courtId, BookingStatus status);
    long countByCourt_Owner_IdAndStatus(UUID ownerId, BookingStatus status);

    @Query("""
            select count(booking) > 0 from Booking booking
            where booking.court.id = :courtId
              and booking.status in :statuses
              and booking.startsAt < :endsAt
              and booking.endsAt > :startsAt
            """)
    boolean existsOverlappingBooking(@Param("courtId") UUID courtId,
                                     @Param("startsAt") java.time.LocalDateTime startsAt,
                                     @Param("endsAt") java.time.LocalDateTime endsAt,
                                     @Param("statuses") List<BookingStatus> statuses);
}
