package com.playslot.playslot.repository;

import com.playslot.playslot.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    long countByUser_IdAndReadFalse(UUID userId);

    boolean existsByUser_IdAndType(UUID userId, com.playslot.playslot.model.NotificationType type);

    @Modifying
    @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    int markAllRead(@Param("userId") UUID userId);
}
