package com.playslot.playslot.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record Court(
        UUID id,
        UUID ownerId,
        String name,
        SportType sportType,
        String city,
        String district,
        String address,
        String description,
        BigDecimal hourlyPrice,
        List<String> photoUrls,
        List<String> amenities
) {
    public Court {
        photoUrls = List.copyOf(photoUrls);
        amenities = List.copyOf(amenities);
    }
}
