package com.terangacivil.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "Le nom complet est obligatoire")
    @JsonProperty("nom_complet")
    @JsonAlias({"nomComplet", "nom_complet"})
    private String nomComplet;

    @NotBlank(message = "Le téléphone est obligatoire")
    private String telephone;

    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;

    @NotBlank(message = "Le code de vérification est obligatoire")
    private String code;
}
