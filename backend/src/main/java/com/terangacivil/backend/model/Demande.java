package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

@Entity
@Table(name = "demandes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Demande {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citoyen_id")
    private User citoyen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id")
    private Activity activite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commune_id")
    private Commune commune;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "centre_id")
    private Centre centre;

    @Column(nullable = false, length = 50)
    private String statut = "en_attente"; // en_attente, en_cours, valide, rejete, disponible

    @Column(length = 100)
    private String motif;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode donnees;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "documents_url", columnDefinition = "jsonb")
    private JsonNode documentsUrl;

    @Column(name = "montant_paye")
    private Integer montantPaye;

    @Column(name = "mode_paiement", length = 20)
    private String modePaiement; // orange_money, wave, especes

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    private User agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "officier_id")
    private User officier;

    @Column(name = "date_soumission")
    private LocalDateTime dateSoumission = LocalDateTime.now();

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(name = "date_disponibilite")
    private LocalDateTime dateDisponibilite;

    @Column(name = "motif_rejet", columnDefinition = "TEXT")
    private String motifRejet;

    @Column(name = "presence_physique_requise")
    private Boolean presencePhysiqueRequise = false;


    @Column(nullable = false)
    private Boolean archive = false;

    @Column(name = "archive_date")
    private LocalDateTime archiveDate;

    @Column(name = "document_draft_url", columnDefinition = "TEXT")
    private String documentDraftUrl;

    @Column(name = "document_final_url", columnDefinition = "TEXT")
    private String documentFinalUrl;

    @Column(name = "document_final_importe_url", columnDefinition = "TEXT")
    private String documentFinalImporteUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_step_id")
    private WorkflowStep currentStep;

    @Column(name = "evaluation_score")
    private Integer evaluationScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "centre_delivrance_id")
    private Centre centreDelivrance;

    @Column(name = "statut_transfert", length = 50)
    private String statutTransfert = "none"; // none, en_attente_envoi, en_transit, recu

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "discussion_transfert", columnDefinition = "jsonb")
    private JsonNode discussionTransfert;

    @Column(name = "annee")
    private Integer annee;

    @Column(name = "numero")
    private Integer numero;

    public boolean isExpired() {
        if (dateSoumission == null || activite == null) return false;
        String s = statut;
        if ("valide".equalsIgnoreCase(s) || "rejete".equalsIgnoreCase(s) || "pret".equalsIgnoreCase(s) || "disponible".equalsIgnoreCase(s) || "valide_cloture".equalsIgnoreCase(s)) {
            return false;
        }
        Integer maxJours = activite.getDelaiMaxJours();
        if (maxJours == null) maxJours = 5;
        java.time.LocalDateTime deadline = dateSoumission.plusDays(maxJours);
        return java.time.LocalDateTime.now().isAfter(deadline);
    }

    @PrePersist
    protected void onCreate() {
        dateSoumission = LocalDateTime.now();
        archive = false;
        if (statut == null) {
            statut = "en_attente";
        }
    }
}
