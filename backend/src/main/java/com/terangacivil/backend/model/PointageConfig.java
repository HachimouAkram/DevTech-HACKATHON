package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalTime;

@Entity
@Table(name = "pointage_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PointageConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "centre_id", unique = true)
    private Centre centre;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bureau_id", unique = true)
    private Bureau bureau;

    @Column(name = "heure_ouverture", nullable = false)
    private LocalTime heureOuverture = LocalTime.of(8, 0);

    @Column(name = "heure_fermeture", nullable = false)
    private LocalTime heureFermeture = LocalTime.of(17, 0);

    @Column(name = "heure_limite_arrivee", nullable = false)
    private LocalTime heureLimiteArrivee = LocalTime.of(8, 30);

    @Column(nullable = false)
    private Boolean actif = true;
}
