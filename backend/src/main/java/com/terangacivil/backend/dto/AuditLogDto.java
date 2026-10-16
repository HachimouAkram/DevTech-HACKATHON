package com.terangacivil.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDto {
    private Integer id;
    private String nomComplet;
    private String profil;
    private String centreNom;
    private String communeNom;
    private String action;
    private String entityType;
    private Integer entityId;
    private JsonNode oldValues;
    private JsonNode newValues;
    private String ipAddress;
    private LocalDateTime createdAt;
}
