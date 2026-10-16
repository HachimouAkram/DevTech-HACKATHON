package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/centres")
public class CentreConfigController {

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private BureauRepository bureauRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private CentreBureauRepository centreBureauRepository;

    @Autowired
    private CentreServiceRepository centreServiceRepository;

    @Autowired
    private CentreActiviteRepository centreActiviteRepository;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
    }

    private void checkCentreAccess(User user, Centre centre) {
        if (user.hasPermission("GERER_GLOBAL")) return;

        if (user.hasPermission("GERER_REGION")) {
            boolean inScope = user.getRegionsGerees().stream()
                    .anyMatch(r -> r.getId().equals(centre.getCommune().getDepartement().getRegion().getId()));
            if (inScope) return;
        }

        if (user.hasPermission("GERER_DEPARTEMENT")) {
            boolean inScope = user.getDepartementsGeres().stream()
                    .anyMatch(d -> d.getId().equals(centre.getCommune().getDepartement().getId()));
            if (inScope) return;
        }

        if (user.hasPermission("GERER_COMMUNE")) {
            boolean inScope = user.getCommunesGerees() != null && user.getCommunesGerees().stream()
                    .anyMatch(c -> c.getId().equals(centre.getCommune().getId()));
            if (inScope) return;
            if (user.getCommune() != null && user.getCommune().getId().equals(centre.getCommune().getId())) {
                return;
            }
        }

        if (user.hasPermission("GERER_CENTRE")) {
            if (user.getCentre() != null && user.getCentre().getId().equals(centre.getId())) {
                return;
            }
        }

        throw new IllegalArgumentException("Vous n'êtes pas autorisé à configurer ce centre.");
    }

    private void checkCentreReadAccess(User user, Centre centre) {
        if (user.hasPermission("GERER_GLOBAL")) return;

        if (user.hasPermission("GERER_REGION")) {
            boolean inScope = user.getRegionsGerees().stream()
                    .anyMatch(r -> r.getId().equals(centre.getCommune().getDepartement().getRegion().getId()));
            if (inScope) return;
        }

        if (user.hasPermission("GERER_DEPARTEMENT")) {
            boolean inScope = user.getDepartementsGeres().stream()
                    .anyMatch(d -> d.getId().equals(centre.getCommune().getDepartement().getId()));
            if (inScope) return;
        }

        if (user.hasPermission("GERER_COMMUNE")) {
            boolean inScope = user.getCommunesGerees() != null && user.getCommunesGerees().stream()
                    .anyMatch(c -> c.getId().equals(centre.getCommune().getId()));
            if (inScope) return;
            if (user.getCommune() != null && user.getCommune().getId().equals(centre.getCommune().getId())) {
                return;
            }
        }

        if (user.hasPermission("GERER_CENTRE") || user.hasPermission("GERER_BUREAU") || user.hasPermission("GERER_SERVICES")) {
            if (user.getCentre() != null && user.getCentre().getId().equals(centre.getId())) {
                return;
            }
        }

        throw new IllegalArgumentException("Vous n'êtes pas autorisé à consulter la configuration de ce centre.");
    }

    @GetMapping("/{id}/configuration")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConfiguration(
            @PathVariable("id") Integer centreId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreReadAccess(currentUser, centre);

        List<CentreBureau> centreBureaux = centreBureauRepository.findByCentreIdAndActifTrue(centreId);

        List<Map<String, Object>> bureauxConfig = centreBureaux.stream().map(cb -> {
            Bureau bureau = cb.getBureau();
            Map<String, Object> bMap = new HashMap<>();
            bMap.put("bureau_id", bureau.getId());
            bMap.put("bureau_nom", bureau.getNom());
            bMap.put("bureau_code", bureau.getCode());
            bMap.put("bureau_icone", bureau.getIcone());
            bMap.put("bureau_couleur", bureau.getCouleur());
            bMap.put("actif", cb.getActif());

            List<CentreService> centreServices = centreServiceRepository
                    .findByCentreIdAndBureauId(centreId, bureau.getId());

            List<Map<String, Object>> servicesConfig = centreServices.stream().map(cs -> {
                Service service = cs.getService();
                Map<String, Object> sMap = new HashMap<>();
                sMap.put("service_id", service.getId());
                sMap.put("service_nom", service.getNom());
                sMap.put("service_icone", service.getIcone());
                sMap.put("actif", cs.getActif());

                List<Activity> catalogueActivities = activityRepository.findByServiceIdAndActifTrue(service.getId());
                List<CentreActivite> centreActivites = centreActiviteRepository
                        .findByCentreIdAndServiceId(centreId, service.getId());
                Map<Integer, CentreActivite> caMap = centreActivites.stream()
                        .collect(Collectors.toMap(ca -> ca.getActivite().getId(), ca -> ca));

                List<Map<String, Object>> activitesConfig = catalogueActivities.stream().map(activite -> {
                    Map<String, Object> aMap = new HashMap<>();
                    aMap.put("activite_id", activite.getId());
                    aMap.put("activite_nom", activite.getNom());
                    aMap.put("prix", activite.getPrix());
                    aMap.put("delai_min_jours", activite.getDelaiMinJours());
                    aMap.put("delai_max_jours", activite.getDelaiMaxJours());
                    
                    CentreActivite ca = caMap.get(activite.getId());
                    aMap.put("actif", ca != null ? ca.getActif() : false);
                    return aMap;
                }).collect(Collectors.toList());

                sMap.put("activites", activitesConfig);
                return sMap;
            }).collect(Collectors.toList());

            bMap.put("services", servicesConfig);
            return bMap;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("centre_id", centreId);
        data.put("centre_nom", centre.getNom());
        data.put("commune_nom", centre.getCommune().getNom());
        data.put("configuration", bureauxConfig);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}/bureaux-disponibles")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBureauxDisponibles(
            @PathVariable("id") Integer centreId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        List<Bureau> tousLesBureaux = bureauRepository.findByActifTrueOrderByOrdreAsc();
        List<CentreBureau> activations = centreBureauRepository.findByCentreId(centreId);

        Map<Integer, CentreBureau> activationMap = activations.stream()
                .collect(Collectors.toMap(cb -> cb.getBureau().getId(), cb -> cb));

        List<Map<String, Object>> result = tousLesBureaux.stream().map(bureau -> {
            Map<String, Object> m = new HashMap<>();
            m.put("bureau_id", bureau.getId());
            m.put("bureau_nom", bureau.getNom());
            m.put("bureau_description", bureau.getDescription());
            m.put("bureau_code", bureau.getCode());
            m.put("bureau_icone", bureau.getIcone());
            m.put("bureau_couleur", bureau.getCouleur());
            m.put("ordre", bureau.getOrdre());

            CentreBureau cb = activationMap.get(bureau.getId());
            m.put("active_dans_centre", cb != null);
            m.put("actif", cb != null && cb.getActif());

            long nbServicesTotal = serviceRepository.findByBureauIdAndActifTrue(bureau.getId()).size();
            long nbServicesActifs = centreServiceRepository
                    .findByCentreIdAndBureauId(centreId, bureau.getId())
                    .stream().filter(cs -> cs.getActif()).count();
            m.put("nb_services_catalogue", nbServicesTotal);
            m.put("nb_services_actifs", nbServicesActifs);

            return m;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("bureaux", result);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/{id}/bureaux/{bureauId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> activerBureau(
            @PathVariable("id") Integer centreId,
            @PathVariable("bureauId") Integer bureauId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        Bureau bureau = bureauRepository.findById(bureauId)
                .orElseThrow(() -> new IllegalArgumentException("Bureau non trouvé"));

        Optional<CentreBureau> existing = centreBureauRepository
                .findByCentreIdAndBureauId(centreId, bureauId);

        CentreBureau cb;
        if (existing.isPresent()) {
            cb = existing.get();
            cb.setActif(true);
        } else {
            cb = new CentreBureau();
            cb.setCentre(centre);
            cb.setBureau(bureau);
            cb.setActif(true);
            cb.setConfigurePar(currentUser);
        }
        centreBureauRepository.save(cb);

        Map<String, Object> data = new HashMap<>();
        data.put("message", "Bureau '" + bureau.getNom() + "' activé dans le centre " + centre.getNom());
        data.put("centre_id", centreId);
        data.put("bureau_id", bureauId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/{id}/bureaux/{bureauId}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> desactiverBureau(
            @PathVariable("id") Integer centreId,
            @PathVariable("bureauId") Integer bureauId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        centreBureauRepository.findByCentreIdAndBureauId(centreId, bureauId)
                .ifPresent(cb -> { cb.setActif(false); centreBureauRepository.save(cb); });

        List<CentreService> services = centreServiceRepository
                .findByCentreIdAndBureauId(centreId, bureauId);
        services.forEach(cs -> cs.setActif(false));
        centreServiceRepository.saveAll(services);

        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Bureau désactivé dans ce centre.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/bureaux/{bureauId}/services-disponibles")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getServicesDisponibles(
            @PathVariable("id") Integer centreId,
            @PathVariable("bureauId") Integer bureauId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        List<Service> tousLesServices = serviceRepository.findByBureauIdAndActifTrue(bureauId);
        List<CentreService> activations = centreServiceRepository
                .findByCentreIdAndBureauId(centreId, bureauId);

        Map<Integer, CentreService> activationMap = activations.stream()
                .collect(Collectors.toMap(cs -> cs.getService().getId(), cs -> cs));

        List<Map<String, Object>> result = tousLesServices.stream().map(service -> {
            Map<String, Object> m = new HashMap<>();
            m.put("service_id", service.getId());
            m.put("service_nom", service.getNom());
            m.put("service_description", service.getDescription());
            m.put("service_icone", service.getIcone());

            CentreService cs = activationMap.get(service.getId());
            m.put("active_dans_centre", cs != null);
            m.put("actif", cs != null && cs.getActif());

            long nbActivites = activityRepository.findByServiceIdAndActifTrue(service.getId()).size();
            m.put("nb_activites_catalogue", nbActivites);

            return m;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("services", result);
        data.put("bureau_id", bureauId);
        data.put("centre_id", centreId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/{id}/services/{serviceId}")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> activerService(
            @PathVariable("id") Integer centreId,
            @PathVariable("serviceId") Integer serviceId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service non trouvé"));

        Optional<CentreService> existing = centreServiceRepository
                .findByCentreIdAndServiceId(centreId, serviceId);

        CentreService cs;
        if (existing.isPresent()) {
            cs = existing.get();
            cs.setActif(true);
        } else {
            cs = new CentreService();
            cs.setCentre(centre);
            cs.setService(service);
            cs.setActif(true);
            cs.setConfigurePar(currentUser);
        }
        centreServiceRepository.save(cs);

        List<Activity> activitesDuService = activityRepository.findByServiceIdAndActifTrue(serviceId);
        int nbActivitesCreees = 0;
        for (Activity activite : activitesDuService) {
            if (!centreActiviteRepository.existsByCentreIdAndActiviteId(centreId, activite.getId())) {
                CentreActivite ca = new CentreActivite();
                ca.setCentre(centre);
                ca.setActivite(activite);
                ca.setActif(true);
                ca.setConfigurePar(currentUser);
                centreActiviteRepository.save(ca);
                nbActivitesCreees++;
            }
        }

        Map<String, Object> data = new HashMap<>();
        data.put("message", "Service '" + service.getNom() + "' activé dans le centre " + centre.getNom());
        data.put("centre_id", centreId);
        data.put("service_id", serviceId);
        data.put("nb_activites_activees", nbActivitesCreees + (activitesDuService.size() - nbActivitesCreees));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/{id}/services/{serviceId}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> desactiverService(
            @PathVariable("id") Integer centreId,
            @PathVariable("serviceId") Integer serviceId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        centreServiceRepository.findByCentreIdAndServiceId(centreId, serviceId)
                .ifPresent(cs -> { cs.setActif(false); centreServiceRepository.save(cs); });

        List<CentreActivite> activites = centreActiviteRepository
                .findByCentreIdAndServiceId(centreId, serviceId);
        activites.forEach(ca -> ca.setActif(false));
        centreActiviteRepository.saveAll(activites);

        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Service désactivé dans ce centre.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/services/{serviceId}/activites")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getActivitesService(
            @PathVariable("id") Integer centreId,
            @PathVariable("serviceId") Integer serviceId) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        List<Activity> toutesLesActivites = activityRepository.findByServiceIdAndActifTrue(serviceId);
        List<CentreActivite> centreActivites = centreActiviteRepository
                .findByCentreIdAndServiceId(centreId, serviceId);

        Map<Integer, CentreActivite> activationMap = centreActivites.stream()
                .collect(Collectors.toMap(ca -> ca.getActivite().getId(), ca -> ca));

        List<Map<String, Object>> result = toutesLesActivites.stream().map(activite -> {
            Map<String, Object> m = new HashMap<>();
            m.put("activite_id", activite.getId());
            m.put("activite_nom", activite.getNom());
            m.put("prix", activite.getPrix());
            m.put("delai_min_jours", activite.getDelaiMinJours());
            m.put("delai_max_jours", activite.getDelaiMaxJours());

            CentreActivite ca = activationMap.get(activite.getId());
            m.put("active_dans_centre", ca != null);
            m.put("actif", ca != null && ca.getActif());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("activites", result);
        data.put("centre_id", centreId);
        data.put("service_id", serviceId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PatchMapping("/{id}/activites/{activiteId}/toggle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleActivite(
            @PathVariable("id") Integer centreId,
            @PathVariable("activiteId") Integer activiteId,
            @RequestBody Map<String, Object> body) {

        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));
        checkCentreAccess(currentUser, centre);

        Activity activite = activityRepository.findById(activiteId)
                .orElseThrow(() -> new IllegalArgumentException("Activité non trouvée"));

        Optional<CentreActivite> existing = centreActiviteRepository
                .findByCentreIdAndActiviteId(centreId, activiteId);

        CentreActivite ca;
        if (existing.isPresent()) {
            ca = existing.get();
        } else {
            ca = new CentreActivite();
            ca.setCentre(centre);
            ca.setActivite(activite);
            ca.setConfigurePar(currentUser);
        }

        Boolean actif = body.containsKey("actif") ? (Boolean) body.get("actif") : !ca.getActif();
        ca.setActif(actif);
        centreActiviteRepository.save(ca);

        Map<String, Object> data = new HashMap<>();
        data.put("activite_id", activiteId);
        data.put("centre_id", centreId);
        data.put("actif", actif);
        data.put("message", "Activité '" + activite.getNom() + "' " + (actif ? "activée" : "désactivée") + " dans le centre " + centre.getNom());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{id}/disponibilite")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDisponibilite(
            @PathVariable("id") Integer centreId) {

        List<CentreService> servicesActifs = centreServiceRepository.findByCentreIdAndActifTrue(centreId);

        List<Map<String, Object>> services = servicesActifs.stream().map(cs -> {
            Service service = cs.getService();
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("service_id", service.getId());
            sMap.put("service_nom", service.getNom());
            sMap.put("service_icone", service.getIcone());
            if (service.getBureau() != null) {
                sMap.put("bureau_id", service.getBureau().getId());
                sMap.put("bureau_nom", service.getBureau().getNom());
                sMap.put("bureau_icone", service.getBureau().getIcone());
                sMap.put("bureau_couleur", service.getBureau().getCouleur());
            }

            List<Map<String, Object>> activites = centreActiviteRepository
                    .findActiveByCentreIdAndServiceId(centreId, service.getId())
                    .stream().map(ca -> {
                        Activity a = ca.getActivite();
                        Map<String, Object> aMap = new HashMap<>();
                        aMap.put("activite_id", a.getId());
                        aMap.put("activite_nom", a.getNom());
                        aMap.put("prix", a.getPrix());
                        aMap.put("delai_min_jours", a.getDelaiMinJours());
                        aMap.put("delai_max_jours", a.getDelaiMaxJours());
                        return aMap;
                    }).collect(Collectors.toList());

            sMap.put("activites", activites);
            return sMap;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("centre_id", centreId);
        data.put("services_disponibles", services);
        data.put("services", services);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/disponibilite/service/{serviceId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCentresAvecService(
            @PathVariable("serviceId") Integer serviceId) {

        List<CentreService> centresAvecService = centreServiceRepository
                .findByServiceIdAndActifTrue(serviceId);

        List<Map<String, Object>> centres = centresAvecService.stream().map(cs -> {
            Centre centre = cs.getCentre();
            Map<String, Object> m = new HashMap<>();
            m.put("centre_id", centre.getId());
            m.put("centre_nom", centre.getNom());
            m.put("commune_nom", centre.getCommune().getNom());
            if (centre.getCommune().getDepartement() != null) {
                m.put("departement_nom", centre.getCommune().getDepartement().getNom());
                if (centre.getCommune().getDepartement().getRegion() != null) {
                    m.put("region_nom", centre.getCommune().getDepartement().getRegion().getNom());
                }
            }
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("service_id", serviceId);
        data.put("centres", centres);
        data.put("total", centres.size());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/disponibilite/activity/{activityId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCentresAvecActivity(
            @PathVariable("activityId") Integer activityId) {

        List<CentreActivite> centresAvecActivity = centreActiviteRepository
                .findByActiviteIdAndActifTrue(activityId);

        List<Map<String, Object>> centres = centresAvecActivity.stream().map(ca -> {
            Centre centre = ca.getCentre();
            Map<String, Object> m = new HashMap<>();
            m.put("centre_id", centre.getId());
            m.put("centre_nom", centre.getNom());
            m.put("commune_id", centre.getCommune().getId());
            m.put("commune_nom", centre.getCommune().getNom());
            if (centre.getCommune().getDepartement() != null) {
                m.put("departement_id", centre.getCommune().getDepartement().getId());
                m.put("departement_nom", centre.getCommune().getDepartement().getNom());
                if (centre.getCommune().getDepartement().getRegion() != null) {
                    m.put("region_id", centre.getCommune().getDepartement().getRegion().getId());
                    m.put("region_nom", centre.getCommune().getDepartement().getRegion().getNom());
                }
            }
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("activity_id", activityId);
        data.put("centres", centres);
        data.put("total", centres.size());
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
