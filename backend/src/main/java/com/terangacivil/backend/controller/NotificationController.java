package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.Notification;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.NotificationRepository;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.terangacivil.backend.service.SseService sseService;

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId()).orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
    }

    private Map<String, Object> mapNotification(Notification n) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", n.getId());
        m.put("type", n.getType());
        m.put("titre", n.getTitre());
        m.put("contenu", n.getContenu());
        m.put("lu", n.getLu());
        m.put("date_envoi", n.getDateEnvoi());
        m.put("demande_id", n.getDemandeId());
        return m;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNotifications() {
        User currentUser = getCurrentUser();
        List<Map<String, Object>> mapped = notificationRepository.findByUserIdOrderByDateEnvoiDesc(currentUser.getId()).stream()
                .map(this::mapNotification)
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("notifications", mapped);

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAsRead(@PathVariable("id") Integer id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification non trouvée"));

        User currentUser = getCurrentUser();
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }

        notification.setLu(true);
        Notification saved = notificationRepository.save(notification);
        sseService.broadcast("refresh_notifications", "notification_read");

        Map<String, Object> data = new HashMap<>();
        data.put("notification", mapNotification(saved));

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        User currentUser = getCurrentUser();
        notificationRepository.markAllAsRead(currentUser.getId());
        sseService.broadcast("refresh_notifications", "all_read");

        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Toutes les notifications ont été marquées comme lues.");
        return ResponseEntity.ok(response);
    }
}
