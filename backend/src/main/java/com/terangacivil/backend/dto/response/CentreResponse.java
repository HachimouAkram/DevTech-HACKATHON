package com.terangacivil.backend.dto.response;

import com.terangacivil.backend.model.Centre;
import lombok.Data;

@Data
public class CentreResponse {
    private Integer id;
    private String nom;
    private String code;
    private Double latitude;
    private Double longitude;
    private Integer commune_id;
    private String commune_nom;
    private Integer departement_id;
    private String departement_nom;
    private Integer region_id;
    private String region_nom;

    public CentreResponse(Centre centre) {
        this.id = centre.getId();
        this.nom = centre.getNom();
        this.code = centre.getCode();
        this.latitude = centre.getLatitude();
        this.longitude = centre.getLongitude();
        if (centre.getCommune() != null) {
            this.commune_id = centre.getCommune().getId();
            this.commune_nom = centre.getCommune().getNom();
            if (centre.getCommune().getDepartement() != null) {
                this.departement_id = centre.getCommune().getDepartement().getId();
                this.departement_nom = centre.getCommune().getDepartement().getNom();
                if (centre.getCommune().getDepartement().getRegion() != null) {
                    this.region_id = centre.getCommune().getDepartement().getRegion().getId();
                    this.region_nom = centre.getCommune().getDepartement().getRegion().getNom();
                }
            }
        }
    }
}
