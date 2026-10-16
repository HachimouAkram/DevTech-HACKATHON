package com.terangacivil.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.terangacivil.backend.model.Demande;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class DemandeResponse {
    private Integer id;
    private String reference;
    private String statut;
    private JsonNode donnees;
    private String motif;

    @JsonProperty("documents_url")
    private JsonNode documentsUrl;

    @JsonProperty("montant_paye")
    private Integer montantPaye;

    @JsonProperty("mode_paiement")
    private String modePaiement;

    @JsonProperty("date_soumission")
    private LocalDateTime dateSoumission;

    @JsonProperty("date_validation")
    private LocalDateTime dateValidation;

    @JsonProperty("date_disponibilite")
    private LocalDateTime dateDisponibilite;

    @JsonProperty("motif_rejet")
    private String motifRejet;

    private Boolean archive;

    @JsonProperty("archive_date")
    private LocalDateTime archiveDate;

    // Flat fields expected by clients
    @JsonProperty("citoyen_nom")
    private String citoyenNom;

    @JsonProperty("citoyen_telephone")
    private String citoyenTelephone;

    @JsonProperty("activite_nom")
    private String activiteNom;

    @JsonProperty("service_nom")
    private String serviceNom;

    @JsonProperty("activite_id")
    private Integer activiteId;

    @JsonProperty("presence_physique_requise")
    private Boolean presencePhysiqueRequise;

    @JsonProperty("agent_nom")
    private String agentNom;

    @JsonProperty("officier_nom")
    private String officierNom;

    @JsonProperty("agent_id")
    private Integer agentId;

    @JsonProperty("officier_id")
    private Integer officierId;

    @JsonProperty("current_step_nom")
    private String currentStepNom;

    @JsonProperty("current_step_action")
    private String currentStepAction;

    @JsonProperty("current_step_ordre")
    private Integer currentStepOrdre;

    @JsonProperty("centre_id")
    private Integer centreId;

    @JsonProperty("centre_nom")
    private String centreNom;

    @JsonProperty("has_document_final")
    private Boolean hasDocumentFinal;

    @JsonProperty("evaluation_score")
    private Integer evaluationScore;

    @JsonProperty("centre_delivrance_id")
    private Integer centreDelivranceId;

    @JsonProperty("centre_delivrance_nom")
    private String centreDelivranceNom;

    @JsonProperty("centre_delivrance_commune_nom")
    private String centreDelivranceCommuneNom;

    @JsonProperty("centre_delivrance_departement_nom")
    private String centreDelivranceDepartementNom;

    @JsonProperty("centre_delivrance_region_nom")
    private String centreDelivranceRegionNom;

    @JsonProperty("statut_transfert")
    private String statutTransfert;

    @JsonProperty("discussion_transfert")
    private JsonNode discussionTransfert;

    public DemandeResponse(Demande d) {
        this.id = d.getId();
        this.reference = d.getReference();
        this.statut = ("hors_delais".equalsIgnoreCase(d.getStatut()) || d.isExpired()) ? "hors_delais" : d.getStatut();
        this.donnees = d.getDonnees();
        this.motif = d.getMotif();
        this.documentsUrl = d.getDocumentsUrl();
        this.montantPaye = d.getMontantPaye();
        this.modePaiement = d.getModePaiement();
        this.dateSoumission = d.getDateSoumission();
        this.dateValidation = d.getDateValidation();
        this.dateDisponibilite = d.getDateDisponibilite();
        this.motifRejet = d.getMotifRejet();
        this.archive = d.getArchive();
        this.archiveDate = d.getArchiveDate();

        if (d.getCitoyen() != null) {
            this.citoyenNom = d.getCitoyen().getNomComplet();
            this.citoyenTelephone = d.getCitoyen().getTelephone();
        }

        if (d.getActivite() != null) {
            this.activiteNom = d.getActivite().getNom();
            this.activiteId = d.getActivite().getId();
            this.presencePhysiqueRequise = d.getActivite().getPresencePhysiqueRequise();
            if (d.getActivite().getService() != null) {
                this.serviceNom = d.getActivite().getService().getNom();
            }
        }

        if (d.getCentre() != null) {
            this.centreId = d.getCentre().getId();
            this.centreNom = d.getCentre().getNom();
        }

        if (d.getCentreDelivrance() != null) {
            this.centreDelivranceId = d.getCentreDelivrance().getId();
            this.centreDelivranceNom = d.getCentreDelivrance().getNom();
            if (d.getCentreDelivrance().getCommune() != null) {
                this.centreDelivranceCommuneNom = d.getCentreDelivrance().getCommune().getNom();
                if (d.getCentreDelivrance().getCommune().getDepartement() != null) {
                    this.centreDelivranceDepartementNom = d.getCentreDelivrance().getCommune().getDepartement().getNom();
                    if (d.getCentreDelivrance().getCommune().getDepartement().getRegion() != null) {
                        this.centreDelivranceRegionNom = d.getCentreDelivrance().getCommune().getDepartement().getRegion().getNom();
                    }
                }
            }
        }
        
        this.statutTransfert = d.getStatutTransfert();
        this.discussionTransfert = d.getDiscussionTransfert();

        this.evaluationScore = d.getEvaluationScore();

        if (d.getAgent() != null) {
            this.agentNom = d.getAgent().getNomComplet();
            this.agentId = d.getAgent().getId();
        }

        if (d.getOfficier() != null) {
            this.officierNom = d.getOfficier().getNomComplet();
            this.officierId = d.getOfficier().getId();
        }

        if (d.getCurrentStep() != null) {
            this.currentStepNom = d.getCurrentStep().getNom();
            this.currentStepAction = d.getCurrentStep().getActionAttendue();
            this.currentStepOrdre = d.getCurrentStep().getOrdre();
        }

        this.hasDocumentFinal = (d.getDocumentFinalUrl() != null && !d.getDocumentFinalUrl().isEmpty()) ||
                                (d.getDocumentFinalImporteUrl() != null && !d.getDocumentFinalImporteUrl().isEmpty());
    }
}
