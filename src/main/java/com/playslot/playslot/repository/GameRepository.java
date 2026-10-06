package com.playslot.playslot.repository;

import com.playslot.playslot.model.Game;
import com.playslot.playslot.model.GameStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface GameRepository extends JpaRepository<Game, UUID> {
    List<Game> findByStartsAtAfterOrderByStartsAtAsc(LocalDateTime startsAt);
    List<Game> findByStatusAndStartsAtAfterOrderByStartsAtAsc(GameStatus status, LocalDateTime startsAt);
    List<Game> findByParticipants_IdOrderByStartsAtDesc(UUID userId);
    List<Game> findAllByOrderByStartsAtAsc();
    long countByStatus(GameStatus status);
}
