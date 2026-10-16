package com.terangacivil.backend.dto.response;

import com.terangacivil.backend.model.Departement;
import lombok.Data;

@Data
public class DepartementResponse {
    private Integer id;
    private String nom;
    private String code;
    private Integer region_id;
    private String region_nom;

    public DepartementResponse(Departement departement) {
        this.id = departement.getId();
        this.nom = departement.getNom();
        this.code = departement.getCode();
        if (departement.getRegion() != null) {
            this.region_id = departement.getRegion().getId();
            this.region_nom = departement.getRegion().getNom();
        }
    }
}
