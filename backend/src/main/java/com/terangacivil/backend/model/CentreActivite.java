package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Table de liaison : quelles ACTIVITÉS sont actives dans quel CENTRE.
 * Créées automatiquement (actif=true) quand un service est activé.
 * L'admin peut ensuite désactiver/réactiver des activités individuellement.
 */
@Entity
@Table(name = "centre_activites", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"centre_id", "activite_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CentreActivite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id", nullable = false)
    private Activity activite;

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
