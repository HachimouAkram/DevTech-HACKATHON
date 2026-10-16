package com.terangacivil.backend.dto;

import com.terangacivil.backend.model.Permission;
import lombok.Data;

@Data
public class PermissionDTO {
    private Integer id;
    private String nom;
    private String description;

    public PermissionDTO(Permission permission) {
        this.id = permission.getId();
        this.nom = permission.getNom();
        this.description = permission.getDescription();
    }
}
