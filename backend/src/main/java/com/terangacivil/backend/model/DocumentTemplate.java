package com.terangacivil.backend.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "document_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DocumentTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Activity activite;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(nullable = false, length = 20)
    private String type; // "HTML" ou "DOCX"

    @Column(name = "content_html", columnDefinition = "TEXT")
    private String contentHtml;

    @Column(name = "fichier_docx_url", columnDefinition = "TEXT")
    private String fichierDocxUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variables_disponibles", columnDefinition = "jsonb")
    private JsonNode variablesDisponibles;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "champs_agent", columnDefinition = "jsonb")
    private JsonNode champsAgent;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(nullable = false)
    private Boolean principal = false;
}
