package com.terangacivil.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.terangacivil.backend.model.Activity;
import com.terangacivil.backend.model.Service;
import com.terangacivil.backend.model.User;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
public class UserResponse {
    private Integer id;
    private String email;
    private String telephone;

    @JsonProperty("nom_complet")
    private String nomComplet;

    private String role;

    @JsonProperty("commune_id")
    private Integer communeId;

    @JsonProperty("centre_id")
    private Integer centreId;

    @JsonProperty("service_id")
    private Integer serviceId;

    @JsonProperty("commune_nom")
    private String communeNom;

    @JsonProperty("centre_nom")
    private String centreNom;

    @JsonProperty("service_nom")
    private String serviceNom;

    private Boolean actif;
    
    @JsonProperty("must_change_password")
    private Boolean mustChangePassword;

    @JsonProperty("bureau_id")
    private Integer bureauId;

    @JsonProperty("bureau_nom")
    private String bureauNom;

    @JsonProperty("bureau_code")
    private String bureauCode;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    @JsonProperty("last_login")
    private LocalDateTime lastLogin;

    @JsonProperty("cachet_url")
    private String cachetUrl;

    @JsonProperty("signature_url")
    private String signatureUrl;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    @JsonProperty("lieu_naissance")
    private String lieuNaissance;

    @JsonProperty("region_ids")
    private List<Integer> regionIds = new ArrayList<>();

    @JsonProperty("departement_ids")
    private List<Integer> departementIds = new ArrayList<>();

    @JsonProperty("service_ids")
    private List<Integer> serviceIds = new ArrayList<>();

    @JsonProperty("services")
    private List<ServiceItem> services = new ArrayList<>();

    @JsonProperty("activity_ids")
    private List<Integer> activityIds = new ArrayList<>();

    private List<ActivityItem> activities = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ActivityItem {
        private Integer id;
        private String nom;

        public ActivityItem(Integer id, String nom) {
            this.id = id;
            this.nom = nom;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ServiceItem {
        private Integer id;
        private String nom;

        public ServiceItem(Integer id, String nom) {
            this.id = id;
            this.nom = nom;
        }
    }

    private List<String> permissions = new ArrayList<>();

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.telephone = user.getTelephone();
        this.nomComplet = user.getNomComplet();
        this.role = user.getProfil() != null ? user.getProfil().getNom() : null;
        if (user.getProfil() != null && user.getProfil().getPermissions() != null) {
            this.permissions = user.getProfil().getPermissions().stream()
                    .map(p -> p.getNom())
                    .collect(Collectors.toList());
        }
        this.actif = user.getActif();
        this.mustChangePassword = user.getMustChangePassword();
        this.createdAt = user.getCreatedAt();
        this.updatedAt = user.getUpdatedAt();
        this.lastLogin = user.getLastLogin();
        this.cachetUrl = user.getCachetUrl();
        this.signatureUrl = user.getSignatureUrl();
        this.avatarUrl = user.getAvatarUrl();
        this.lieuNaissance = user.getLieuNaissance();
        this.serviceId = user.getServiceId();

        if (user.getCommune() != null) {
            this.communeId = user.getCommune().getId();
            this.communeNom = user.getCommune().getNom();
        }
        if (user.getCentre() != null) {
            this.centreId = user.getCentre().getId();
            this.centreNom = user.getCentre().getNom();
        }

        if (user.getBureau() != null) {
            this.bureauId = user.getBureau().getId();
            this.bureauNom = user.getBureau().getNom();
            this.bureauCode = user.getBureau().getCode();
        }

        if (user.getServices() != null) {
            this.serviceIds = user.getServices().stream().map(Service::getId).collect(Collectors.toList());
            this.services = user.getServices().stream()
                    .map(s -> new ServiceItem(s.getId(), s.getNom()))
                    .collect(Collectors.toList());
            if (!user.getServices().isEmpty()) {
                // Return the first service name for backward compatibility single service_nom
                this.serviceNom = user.getServices().iterator().next().getNom();
            }
        }

        if (user.getRegionsGerees() != null) {
            this.regionIds = user.getRegionsGerees().stream()
                    .map(com.terangacivil.backend.model.Region::getId)
                    .collect(Collectors.toList());
        }

        if (user.getDepartementsGeres() != null) {
            this.departementIds = user.getDepartementsGeres().stream()
                    .map(com.terangacivil.backend.model.Departement::getId)
                    .collect(Collectors.toList());
        }

        if (user.getActivities() != null) {
            this.activityIds = user.getActivities().stream().map(Activity::getId).collect(Collectors.toList());
            this.activities = user.getActivities().stream()
                    .map(a -> new ActivityItem(a.getId(), a.getNom()))
                    .collect(Collectors.toList());
        }
    }
}
