package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "demande_historiques")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DemandeHistorique {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demande_id", nullable = false)
    private Demande demande;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User acteur;

    @Column(nullable = false, length = 100)
    private String action; // ex: "SIGNATURE_AJOUTEE", "RETOUR_CORRECTION", "ETAPE_VALIDEE"

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "date_action")
    private LocalDateTime dateAction = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (dateAction == null) {
            dateAction = LocalDateTime.now();
        }
    }
}
