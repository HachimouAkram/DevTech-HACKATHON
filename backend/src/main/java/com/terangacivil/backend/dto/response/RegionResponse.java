package com.terangacivil.backend.dto.response;

import com.terangacivil.backend.model.Region;
import lombok.Data;

@Data
public class RegionResponse {
    private Integer id;
    private String nom;
    private String code;

    public RegionResponse(Region region) {
        this.id = region.getId();
        this.nom = region.getNom();
        this.code = region.getCode();
    }
}
