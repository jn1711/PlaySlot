package com.playslot.playslot.repository;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.SportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourtRepository extends JpaRepository<Court, UUID> {
    List<Court> findByCityIgnoreCaseAndSportType(String city, SportType sportType);
    List<Court> findByCityIgnoreCase(String city);
    List<Court> findByStatusOrderByCityAscNameAsc(CourtStatus status);
    List<Court> findByOwner_IdOrderByNameAsc(UUID ownerId);
    long countByStatus(CourtStatus status);
    long countByOwner_IdAndStatus(UUID ownerId, CourtStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select court from Court court where court.id = :id")
    Optional<Court> findByIdForUpdate(@Param("id") UUID id);
}
