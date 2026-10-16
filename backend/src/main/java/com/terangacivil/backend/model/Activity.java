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
@Table(name = "activites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(nullable = false)
    private Integer prix;

    @Column(name = "delai_min_jours", nullable = false)
    private Integer delaiMinJours;

    @Column(name = "delai_max_jours", nullable = false)
    private Integer delaiMaxJours;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "champs_requis", columnDefinition = "jsonb")
    private JsonNode champsRequis;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private JsonNode motifs;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(name = "presence_physique_requise", columnDefinition = "boolean default false")
    private Boolean presencePhysiqueRequise = false;
}
