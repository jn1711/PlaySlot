package com.playslot.playslot.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record Review(
        UUID id,
        UUID userId,
        UUID courtId,
        int rating,
        String comment,
        LocalDateTime createdAt
) {
    public Review {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
    }
}
