package com.playslot.playslot.repository;

import com.playslot.playslot.model.Booking;
import com.playslot.playslot.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByUser_IdOrderByStartsAtDesc(UUID userId);
    List<Booking> findByCourt_IdAndStatus(UUID courtId, BookingStatus status);
}
