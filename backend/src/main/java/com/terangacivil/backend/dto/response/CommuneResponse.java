package com.terangacivil.backend.dto.response;

import com.terangacivil.backend.model.Commune;
import lombok.Data;

@Data
public class CommuneResponse {
    private Integer id;
    private String nom;
    private String code;
    private Double latitude;
    private Double longitude;
    private Integer departement_id;
    private String departement_nom;
    private Integer region_id;
    private String region_nom;

    public CommuneResponse(Commune commune) {
        this.id = commune.getId();
        this.nom = commune.getNom();
        this.code = commune.getCode();
        this.latitude = commune.getLatitude();
        this.longitude = commune.getLongitude();
        if (commune.getDepartement() != null) {
            this.departement_id = commune.getDepartement().getId();
            this.departement_nom = commune.getDepartement().getNom();
            if (commune.getDepartement().getRegion() != null) {
                this.region_id = commune.getDepartement().getRegion().getId();
                this.region_nom = commune.getDepartement().getRegion().getNom();
            }
        }
    }
}
