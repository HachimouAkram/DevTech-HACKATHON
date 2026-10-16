package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "signature_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SignatureRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demande_id", nullable = false)
    private Demande demande;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "step_id", nullable = false)
    private WorkflowStep step;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signataire_cible_id", nullable = false)
    private User signataireCible;

    @Column(nullable = false, length = 30)
    private String statut = "en_attente"; // en_attente, signe, retourne

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "date_demande")
    private LocalDateTime dateDemande = LocalDateTime.now();

    @Column(name = "date_signature")
    private LocalDateTime dateSignature;
    
    @PrePersist
    protected void onCreate() {
        if (dateDemande == null) {
            dateDemande = LocalDateTime.now();
        }
    }
}
