package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.fasterxml.jackson.databind.JsonNode;

@Entity
@Table(name = "workflow_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowStep {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circuit_id", nullable = false)
    private WorkflowCircuit circuit;

    @Column(nullable = false)
    private Integer ordre;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(name = "action_attendue", nullable = false, length = 50)
    private String actionAttendue; // validation, signature, finalisation

    @Column(name = "type_signature", length = 20)
    private String typeSignature; // individuelle, multiple

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "profils_autorises", columnDefinition = "jsonb")
    private JsonNode profilsAutorises; // Exemple: liste des noms de profils autorisés ["MAIRE", "OFFICIER"]

    @Column(name = "document_requis")
    private Boolean documentRequis = false;
    
    @Column(name = "notification_email")
    private Boolean notificationEmail = true;
}
