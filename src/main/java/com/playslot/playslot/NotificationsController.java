package com.playslot.playslot;

import com.playslot.playslot.model.Notification;
import com.playslot.playslot.model.NotificationType;
import com.playslot.playslot.model.User;
import com.playslot.playslot.repository.NotificationRepository;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationsController {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationsController(NotificationRepository notificationRepository,
                                   UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<NotificationView> list(Authentication authentication) {
        User user = currentUser(authentication);
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()).stream()
                .map(NotificationView::from).toList();
    }

    @GetMapping("/unread-count")
    @Transactional(readOnly = true)
    public UnreadCount unreadCount(Authentication authentication) {
        User user = currentUser(authentication);
        return new UnreadCount(notificationRepository.countByUser_IdAndReadFalse(user.getId()));
    }

    @PostMapping("/{id}/read")
    @Transactional
    public NotificationView markRead(@PathVariable UUID id, Authentication authentication) {
        User user = currentUser(authentication);
        Notification notification = notificationRepository.findById(id)
                .filter(item -> item.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Хабарлама табылмады"));
        notification.markRead();
        return NotificationView.from(notification);
    }

    @PostMapping("/read-all")
    @Transactional
    public UnreadCount markAllRead(Authentication authentication) {
        User user = currentUser(authentication);
        notificationRepository.markAllRead(user.getId());
        return new UnreadCount(0);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Кіру қажет"));
    }

    public record NotificationView(UUID id, NotificationType type, String title, String message,
                                   LocalDateTime createdAt, boolean read) {
        static NotificationView from(Notification notification) {
            return new NotificationView(notification.getId(), notification.getType(),
                    notification.getTitle(), notification.getMessage(),
                    notification.getCreatedAt(), notification.isRead());
        }
    }

    public record UnreadCount(long unread) {
    }
}
