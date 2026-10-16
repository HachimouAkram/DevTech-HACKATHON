package com.terangacivil.backend.dto;

import com.terangacivil.backend.model.Profil;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

@Data
public class ProfilResponse {
    private Integer id;
    private String nom;
    private String description;
    private List<PermissionDTO> permissions;

    public ProfilResponse(Profil profil) {
        this.id = profil.getId();
        this.nom = profil.getNom();
        this.description = profil.getDescription();
        if (profil.getPermissions() != null) {
            this.permissions = profil.getPermissions().stream()
                .map(PermissionDTO::new)
                .collect(Collectors.toList());
        }
    }
}
