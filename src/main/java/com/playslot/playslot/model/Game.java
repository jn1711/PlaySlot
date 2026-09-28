package com.playslot.playslot.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record Game(
        UUID id,
        UUID organizerId,
        UUID courtId,
        SportType sportType,
        LocalDateTime startsAt,
        int maxPlayers,
        String description,
        List<UUID> participantIds
) {
    public Game {
        if (maxPlayers < 1) {
            throw new IllegalArgumentException("maxPlayers must be positive");
        }
        participantIds = List.copyOf(participantIds);
        if (participantIds.size() > maxPlayers) {
            throw new IllegalArgumentException("Participants cannot exceed maxPlayers");
        }
    }
}
