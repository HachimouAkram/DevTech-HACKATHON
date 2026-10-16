package com.terangacivil.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class ProfilRequest {
    @NotBlank(message = "Le nom du profil est obligatoire")
    private String nom;
    
    private String description;
    
    private List<Integer> permissionIds;
}
