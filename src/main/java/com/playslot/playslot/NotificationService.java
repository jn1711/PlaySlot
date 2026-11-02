package com.playslot.playslot;

import com.playslot.playslot.model.Notification;
import com.playslot.playslot.model.NotificationType;
import com.playslot.playslot.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void notify(com.playslot.playslot.model.User user, NotificationType type, String title, String message) {
        if (user == null || title == null || message == null) {
            return;
        }
        notificationRepository.save(new Notification(user, type, trim(title), trim(message)));
    }

    private static String trim(String value) {
        return value.length() <= 150 ? value : value.substring(0, 150);
    }
}
