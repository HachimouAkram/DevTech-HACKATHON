package com.terangacivil.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DemandeRequest {
    @NotNull(message = "L'activité est obligatoire")
    @JsonProperty("activite_id")
    private Integer activiteId;

    @NotNull(message = "Le centre est obligatoire")
    @JsonProperty("centre_id")
    private Integer centreId;

    @NotNull(message = "Les données du formulaire sont obligatoires")
    private JsonNode donnees;

    private String motif;

    @JsonProperty("montant_paye")
    private Integer montantPaye;

    @JsonProperty("mode_paiement")
    private String modePaiement;

    @JsonProperty("documents_url")
    private JsonNode documentsUrl;

    @JsonProperty("rendez_vous")
    private JsonNode rendezVous;

    @JsonProperty("centre_delivrance_id")
    private Integer centreDelivranceId;
}
