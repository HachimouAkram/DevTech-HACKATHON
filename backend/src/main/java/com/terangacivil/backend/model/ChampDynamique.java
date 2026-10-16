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
@Table(name = "champs_dynamiques")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChampDynamique {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id", nullable = false)
    private Activity activite;

    @Column(name = "nom_champ", nullable = false, length = 100)
    private String nomChamp;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(name = "type_champ", nullable = false, length = 30)
    private String typeChamp = "text";
    // text | number | date | select | phone | textarea | region | departement | commune | centre | sexe

    @Column(nullable = false)
    private Boolean obligatoire = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private JsonNode options; // For select type: [{"value":"M","label":"Masculin"}]

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private JsonNode conditions;

    @Column(name = "motif_lie", length = 100)
    private String motifLie;

    @Column(nullable = false)
    private Integer ordre = 0;

    @Column(length = 200)
    private String placeholder;

    @Column(nullable = false)
    private Boolean actif = true;
}
