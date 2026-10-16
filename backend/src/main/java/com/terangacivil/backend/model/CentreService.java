package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Table de liaison : quels SERVICES sont activés dans quel CENTRE.
 * Quand un service est activé, toutes ses activités sont automatiquement
 * disponibles (créées dans centre_activites avec actif=true).
 */
@Entity
@Table(name = "centre_services", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"centre_id", "service_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CentreService {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    @Column(nullable = false)
    private Boolean actif = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configure_par")
    private User configurePar;

    @Column(name = "configure_le")
    private LocalDateTime configureLe = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        configureLe = LocalDateTime.now();
    }
}
