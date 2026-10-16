package com.terangacivil.backend.dto;

import com.terangacivil.backend.model.RendezVous;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Data
public class RendezVousResponse {
    private Integer id;
    private String numeroRendezVous;
    private Integer demandeId;
    private String demandeReference;
    private Integer citoyenId;
    private String citoyenNom;
    private String citoyenTelephone;
    private Integer centreId;
    private String centreNom;
    private String activiteNom;
    private LocalDate date;
    private LocalTime heure;
    private String statut;
    private LocalDateTime dateCreation;

    public RendezVousResponse(RendezVous rv) {
        this.id = rv.getId();
        this.numeroRendezVous = rv.getNumeroRendezVous();
        if (rv.getDemande() != null) {
            this.demandeId = rv.getDemande().getId();
            this.demandeReference = rv.getDemande().getReference();
            if (rv.getDemande().getActivite() != null) {
                this.activiteNom = rv.getDemande().getActivite().getNom();
            }
        }
        if (rv.getCitoyen() != null) {
            this.citoyenId = rv.getCitoyen().getId();
            this.citoyenNom = rv.getCitoyen().getNomComplet();
            this.citoyenTelephone = rv.getCitoyen().getTelephone();
        }
        if (rv.getCentre() != null) {
            this.centreId = rv.getCentre().getId();
            this.centreNom = rv.getCentre().getNom();
        }
        this.date = rv.getDate();
        this.heure = rv.getHeure();
        this.statut = rv.getStatut();
        this.dateCreation = rv.getDateCreation();
    }
}
