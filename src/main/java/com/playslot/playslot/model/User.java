package com.playslot.playslot.model;

import java.util.UUID;

public record User(
        UUID id,
        String fullName,
        String email,
        String passwordHash
) {
}
