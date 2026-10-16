package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Table de liaison : quels BUREAUX sont activés dans quel CENTRE.
 * Configuré par l'admin de la commune, du département ou de la région.
 */
@Entity
@Table(name = "centre_bureaux", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"centre_id", "bureau_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CentreBureau {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bureau_id", nullable = false)
    private Bureau bureau;

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
