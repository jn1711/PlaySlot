package com.playslot.playslot.repository;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.SportType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CourtRepository extends JpaRepository<Court, UUID> {
    List<Court> findByCityIgnoreCaseAndSportType(String city, SportType sportType);
    List<Court> findByCityIgnoreCase(String city);
}
