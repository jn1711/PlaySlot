package com.playslot.playslot.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record Booking(
        UUID id,
        UUID userId,
        UUID courtId,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        BookingStatus status
) {
}
