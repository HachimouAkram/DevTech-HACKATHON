package com.terangacivil.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "L'identifiant est obligatoire")
    private String identifier;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;
}
