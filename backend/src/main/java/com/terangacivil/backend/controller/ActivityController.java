package com.terangacivil.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.Activity;
import com.terangacivil.backend.model.Service;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.ActivityRepository;
import com.terangacivil.backend.repository.ChampDynamiqueRepository;
import com.terangacivil.backend.repository.ServiceRepository;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.repository.CentreActiviteRepository;
import com.terangacivil.backend.repository.DocumentTemplateRepository;
import com.terangacivil.backend.model.CentreActivite;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Gestion du CATALOGUE GLOBAL des activités.
 * Les activités sont des entités globales liées à un service global.
 * La configuration par commune se fait via /api/communes/{id}/configuration.
 */
@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ChampDynamiqueRepository champDynamiqueRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CentreActiviteRepository centreActiviteRepository;

    @Autowired
    private DocumentTemplateRepository documentTemplateRepository;

    private User getCurrentUser() {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return userRepository.findById(userDetails.getId()).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> mapActivity(Activity a, boolean includeChamps, Set<Integer> activeTemplateActivityIds) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("nom", a.getNom());
        m.put("prix", a.getPrix());
        m.put("delai_min_jours", a.getDelaiMinJours());
        m.put("delai_max_jours", a.getDelaiMaxJours());
        m.put("champs_requis", a.getChampsRequis());
        m.put("motifs", a.getMotifs());
        m.put("actif", a.getActif());
        m.put("presence_physique_requise", a.getPresencePhysiqueRequise());
        
        boolean hasTemplate = activeTemplateActivityIds != null
                ? activeTemplateActivityIds.contains(a.getId())
                : !documentTemplateRepository.findByActiviteIdAndActifTrue(a.getId()).isEmpty();
        m.put("has_template", hasTemplate);

        if (a.getService() != null) {
            m.put("service_id", a.getService().getId());
            m.put("service_nom", a.getService().getNom());
            if (a.getService().getBureau() != null) {
                m.put("bureau_id", a.getService().getBureau().getId());
                m.put("bureau_nom", a.getService().getBureau().getNom());
                m.put("bureau_code", a.getService().getBureau().getCode());
            }
        }

        if (includeChamps) {
            var champs = champDynamiqueRepository
                    .findByActiviteIdAndActifTrueOrderByOrdreAsc(a.getId())
                    .stream()
                    .map(c -> {
                        Map<String, Object> cm = new HashMap<>();
                        cm.put("id", c.getId());
                        cm.put("nom_champ", c.getNomChamp());
                        cm.put("label", c.getLabel());
                        cm.put("type_champ", c.getTypeChamp());
                        cm.put("obligatoire", c.getObligatoire());
                        cm.put("options", c.getOptions());
                        cm.put("ordre", c.getOrdre());
                        cm.put("placeholder", c.getPlaceholder());
                        cm.put("motif_lie", c.getMotifLie());
                        cm.put("conditions", c.getConditions());
                        return cm;
                    })
                    .collect(Collectors.toList());
            m.put("champs_dynamiques", champs);
        }

        return m;
    }

    /**
     * GET /api/activities — liste du catalogue global
     * Optionnel: filtrer par serviceId ou bureauId
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllActivities(
            @RequestParam(value = "serviceId", required = false) Integer serviceId,
            @RequestParam(value = "bureauId", required = false) Integer bureauId,
            @RequestParam(value = "withChamps", required = false, defaultValue = "false") Boolean withChamps) {

        List<Activity> activities;

        if (serviceId != null) {
            activities = activityRepository.findByServiceId(serviceId);
        } else if (bureauId != null) {
            activities = activityRepository.findByServiceBureauId(bureauId);
        } else {
            activities = activityRepository.findAll();
        }

        User currentUser = getCurrentUser();
        Map<Integer, Boolean> centreOverrides = null;
        if (currentUser != null && currentUser.getCentre() != null) {
            centreOverrides = centreActiviteRepository.findByCentreId(currentUser.getCentre().getId())
                    .stream()
                    .collect(Collectors.toMap(ca -> ca.getActivite().getId(), CentreActivite::getActif));
        }
        
        final Map<Integer, Boolean> overrides = centreOverrides;
        
        Set<Integer> activeTemplateActivityIds = new HashSet<>(documentTemplateRepository.findActivityIdsWithActiveTemplates());

        List<Map<String, Object>> mapped = activities.stream()
                .map(a -> {
                    Map<String, Object> m = mapActivity(a, Boolean.TRUE.equals(withChamps), activeTemplateActivityIds);
                    if (overrides != null) {
                        if (overrides.containsKey(a.getId())) {
                            m.put("actif", overrides.get(a.getId()));
                        } else {
                            m.put("actif", false);
                        }
                    }
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("activities", mapped);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * GET /api/activities/{id} — détails d'une activité avec ses champs dynamiques
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getActivity(@PathVariable("id") Integer id) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Activité non trouvée"));
        Map<String, Object> data = new HashMap<>();
        data.put("activity", mapActivity(activity, true, null));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * POST /api/activities — créer une activité dans le catalogue global
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createActivity(@RequestBody Map<String, Object> body) {
        User currentUser = getCurrentUser();
        if (currentUser == null || !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new IllegalArgumentException("Seul le Super Admin peut créer des activités dans le catalogue global.");
        }

        Activity activity = new Activity();
        activity.setNom((String) body.get("nom"));
        activity.setPrix(Integer.parseInt(body.get("prix").toString()));
        activity.setDelaiMinJours(Integer.parseInt(body.get("delai_min_jours").toString()));
        activity.setDelaiMaxJours(Integer.parseInt(body.get("delai_max_jours").toString()));
        activity.setActif(body.containsKey("actif") ? (Boolean) body.get("actif") : true);
        activity.setPresencePhysiqueRequise(body.containsKey("presence_physique_requise") ? (Boolean) body.get("presence_physique_requise") : false);

        if (body.get("service_id") != null) {
            Integer serviceId = Integer.parseInt(body.get("service_id").toString());
            Service service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new IllegalArgumentException("Service non trouvé"));
            activity.setService(service);
        }

        if (body.containsKey("champs_requis")) {
            activity.setChampsRequis(new ObjectMapper().valueToTree(body.get("champs_requis")));
        }

        if (body.containsKey("motifs")) {
            activity.setMotifs(new ObjectMapper().valueToTree(body.get("motifs")));
        }

        Activity saved = activityRepository.save(activity);
        Map<String, Object> data = new HashMap<>();
        data.put("activity", mapActivity(saved, false, null));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * PUT /api/activities/{id} — modifier une activité du catalogue
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateActivity(
            @PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        User currentUser = getCurrentUser();
        if (currentUser == null || !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new IllegalArgumentException("Seul le Super Admin peut modifier les activités du catalogue global.");
        }

        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Activité non trouvée"));

        activity.setNom((String) body.get("nom"));
        activity.setPrix(Integer.parseInt(body.get("prix").toString()));
        activity.setDelaiMinJours(Integer.parseInt(body.get("delai_min_jours").toString()));
        activity.setDelaiMaxJours(Integer.parseInt(body.get("delai_max_jours").toString()));
        if (body.containsKey("actif")) activity.setActif((Boolean) body.get("actif"));
        if (body.containsKey("presence_physique_requise")) activity.setPresencePhysiqueRequise((Boolean) body.get("presence_physique_requise"));

        if (body.get("service_id") != null) {
            Integer serviceId = Integer.parseInt(body.get("service_id").toString());
            Service service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new IllegalArgumentException("Service non trouvé"));
            activity.setService(service);
        }

        if (body.containsKey("champs_requis")) {
            activity.setChampsRequis(new ObjectMapper().valueToTree(body.get("champs_requis")));
        }

        if (body.containsKey("motifs")) {
            activity.setMotifs(new ObjectMapper().valueToTree(body.get("motifs")));
        }

        Activity saved = activityRepository.save(activity);
        Map<String, Object> data = new HashMap<>();
        data.put("activity", mapActivity(saved, false, null));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * DELETE /api/activities/{id} — supprimer une activité du catalogue
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteActivity(@PathVariable("id") Integer id) {
        User currentUser = getCurrentUser();
        if (currentUser == null || !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new IllegalArgumentException("Seul le Super Admin peut supprimer des activités du catalogue global.");
        }
        activityRepository.deleteById(id);
        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Activité supprimée du catalogue avec succès.");
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/activities/{id}/toggle — activer/désactiver une activité du catalogue
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleActivity(
            @PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        User currentUser = getCurrentUser();
        if (currentUser == null || !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new IllegalArgumentException("Seul le Super Admin peut modifier l'état des activités du catalogue.");
        }

        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Activité non trouvée"));
        Boolean actif = (Boolean) body.get("actif");
        activity.setActif(actif != null ? actif : !activity.getActif());
        Activity saved = activityRepository.save(activity);
        Map<String, Object> data = new HashMap<>();
        data.put("activity", mapActivity(saved, false, null));
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
