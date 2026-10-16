package com.terangacivil.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {
    @NotBlank(message = "Le nom complet est obligatoire")
    @JsonProperty("nom_complet")
    private String nomComplet;

    @NotBlank(message = "Le numéro de téléphone est obligatoire")
    private String telephone;

    private String email;

    private String password;

    @JsonProperty("lieu_naissance")
    private String lieuNaissance;

    @NotBlank(message = "Le rôle est obligatoire")
    private String role;

    @JsonProperty("commune_id")
    private Integer communeId;

    @JsonProperty("centre_id")
    private Integer centreId;

    @JsonProperty("service_id")
    private Integer serviceId;

    @JsonProperty("service_ids")
    private List<Integer> serviceIds;

    @JsonProperty("bureau_id")
    private Integer bureauId;

    @JsonProperty("region_ids")
    private List<Integer> regionIds;

    @JsonProperty("departement_ids")
    private List<Integer> departementIds;

    @JsonProperty("activity_ids")
    private List<Integer> activityIds;
}
