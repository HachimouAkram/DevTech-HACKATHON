package com.terangacivil.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StatusUpdateRequest {

    @NotBlank(message = "Le statut est obligatoire")
    private String statut;

    private String motif_rejet;

    private Integer officier_id;
}
