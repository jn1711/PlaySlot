package com.playslot.playslot.model;

import java.util.List;
import java.util.UUID;

public record Team(
        UUID id,
        String name,
        SportType sportType,
        String description,
        UUID captainId,
        List<UUID> memberIds
) {
    public Team {
        memberIds = List.copyOf(memberIds);
    }
}
