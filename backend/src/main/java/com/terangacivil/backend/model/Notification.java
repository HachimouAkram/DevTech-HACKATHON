package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 20)
    private String type; // sms, email, push

    @Column(length = 255)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String contenu;

    @Column(nullable = false)
    private Boolean lu = false;

    @Column(name = "date_envoi")
    private LocalDateTime dateEnvoi = LocalDateTime.now();

    @Column(name = "demande_id")
    private Integer demandeId;

    @PrePersist
    protected void onCreate() {
        dateEnvoi = LocalDateTime.now();
        lu = false;
    }
}
