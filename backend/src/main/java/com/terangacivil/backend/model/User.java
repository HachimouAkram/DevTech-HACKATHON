package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true)
    private String email;

    @Column(nullable = false, unique = true, length = 20)
    private String telephone;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "nom_complet", nullable = false)
    private String nomComplet;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "profil_id")
    private Profil profil;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_regions_gerees",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "region_id")
    )
    private Set<Region> regionsGerees = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_departements_geres",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "departement_id")
    )
    private Set<Departement> departementsGeres = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_communes_gerees",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "commune_id")
    )
    private Set<Commune> communesGerees = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commune_id")
    private Commune commune;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "centre_id")
    private Centre centre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bureau_id")
    private Bureau bureau;

    @Column(name = "service_id")
    private Integer serviceId;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "cachet_url", columnDefinition = "TEXT")
    private String cachetUrl;

    @Column(name = "signature_url", columnDefinition = "TEXT")
    private String signatureUrl;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "lieu_naissance")
    private String lieuNaissance;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "must_change_password")
    private Boolean mustChangePassword = false;

    @Column(name = "verification_code", length = 10)
    private String verificationCode;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_activities",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "activity_id")
    )
    private Set<Activity> activities = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_services",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<Service> services = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    public boolean hasPermission(String permissionNom) {
        if (this.profil == null || this.profil.getPermissions() == null) {
            return false;
        }
        return this.profil.getPermissions().stream()
                .anyMatch(p -> p.getNom().equals(permissionNom));
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
