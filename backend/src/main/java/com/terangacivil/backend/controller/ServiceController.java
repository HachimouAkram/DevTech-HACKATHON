package com.terangacivil.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.Bureau;
import com.terangacivil.backend.model.Service;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.BureauRepository;
import com.terangacivil.backend.repository.ServiceRepository;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Gestion du CATALOGUE GLOBAL des services.
 * Les services sont des entités globales créées par le Super Admin.
 * L'activation par commune se fait via /api/communes/{id}/configuration.
 */
@RestController
@RequestMapping("/api/services")
public class ServiceController {

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private BureauRepository bureauRepository;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId()).orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
    }

    private Map<String, Object> mapService(Service s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("nom", s.getNom());
        m.put("description", s.getDescription());
        m.put("icone", s.getIcone());
        m.put("actif", s.getActif());
        m.put("config", s.getConfig());
        if (s.getBureau() != null) {
            m.put("bureau_id", s.getBureau().getId());
            m.put("bureau_nom", s.getBureau().getNom());
            m.put("bureau_code", s.getBureau().getCode());
            m.put("bureau_icone", s.getBureau().getIcone());
            m.put("bureau_couleur", s.getBureau().getCouleur());
        }
        return m;
    }

    /**
     * GET /api/services — liste du catalogue global
     * Optionnel: filtrer par bureauId
     * Accessible à tous les admins (lecture seule pour les niveaux inférieurs)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllServices(
            @RequestParam(value = "bureauId", required = false) Integer bureauId) {

        User currentUser = getCurrentUser();
        List<Service> services;

        if (currentUser.hasPermission("GERER_GLOBAL") || currentUser.hasPermission("GERER_REGION") || currentUser.hasPermission("GERER_DEPARTEMENT")) {
            if (bureauId != null) {
                services = serviceRepository.findByBureauId(bureauId);
            } else {
                services = serviceRepository.findAll();
            }
        } else if (currentUser.hasPermission("GERER_COMMUNE")) {
            // Un admin commune voit tous les services du catalogue global (pour pouvoir configurer sa commune)
            services = serviceRepository.findAll();
        } else if (currentUser.hasPermission("GERER_BUREAU")) {
            // Un directeur de bureau ne voit que les services de son bureau
            if (currentUser.getBureau() != null) {
                services = serviceRepository.findByBureauId(currentUser.getBureau().getId());
            } else {
                services = List.of();
            }
        } else {
            if (bureauId != null) {
                services = serviceRepository.findByBureauId(bureauId);
            } else {
                services = serviceRepository.findAll();
            }
        }

        List<Map<String, Object>> mapped = services.stream()
                .map(this::mapService)
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("services", mapped);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * GET /api/services/{id} — détails d'un service du catalogue
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getService(@PathVariable("id") Integer id) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service non trouvé"));
        Map<String, Object> data = new HashMap<>();
        data.put("service", mapService(service));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * POST /api/services — créer un service dans le catalogue global
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createService(@RequestBody Map<String, Object> body) {
        Service service = new Service();
        service.setNom((String) body.get("nom"));
        service.setDescription((String) body.get("description"));
        service.setIcone((String) body.getOrDefault("icone", "Briefcase"));
        service.setActif(body.containsKey("actif") ? (Boolean) body.get("actif") : true);

        if (body.get("bureau_id") != null && !body.get("bureau_id").toString().isEmpty()) {
            Integer bureauId = Integer.parseInt(body.get("bureau_id").toString());
            Bureau bureau = bureauRepository.findById(bureauId)
                    .orElseThrow(() -> new IllegalArgumentException("Bureau non trouvé"));
            service.setBureau(bureau);
        } else {
            throw new IllegalArgumentException("Le bureau d'affectation est obligatoire.");
        }

        if (body.containsKey("config")) {
            service.setConfig(new ObjectMapper().valueToTree(body.get("config")));
        }

        Service saved = serviceRepository.save(service);
        Map<String, Object> data = new HashMap<>();
        data.put("service", mapService(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * PUT /api/services/{id} — modifier un service du catalogue
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateService(
            @PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service non trouvé"));

        if (body.containsKey("nom")) service.setNom((String) body.get("nom"));
        if (body.containsKey("description")) service.setDescription((String) body.get("description"));
        if (body.containsKey("icone")) service.setIcone((String) body.get("icone"));
        if (body.containsKey("actif")) service.setActif((Boolean) body.get("actif"));

        if (body.get("bureau_id") != null && !body.get("bureau_id").toString().isEmpty()) {
            Integer bureauId = Integer.parseInt(body.get("bureau_id").toString());
            service.setBureau(bureauRepository.findById(bureauId).orElseThrow(() -> new IllegalArgumentException("Bureau non trouvé")));
        } else if (body.containsKey("bureau_id")) {
            throw new IllegalArgumentException("Le bureau d'affectation est obligatoire.");
        }

        if (body.containsKey("config")) {
            service.setConfig(new ObjectMapper().valueToTree(body.get("config")));
        }

        Service saved = serviceRepository.save(service);
        Map<String, Object> data = new HashMap<>();
        data.put("service", mapService(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * DELETE /api/services/{id} — supprimer un service du catalogue
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteService(@PathVariable("id") Integer id) {
        serviceRepository.deleteById(id);
        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Service supprimé du catalogue avec succès.");
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/services/{id}/toggle — activer/désactiver un service du catalogue
     * Réservé au Super Admin (GERER_GLOBAL)
     */
    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleService(
            @PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service non trouvé"));
        Boolean actif = (Boolean) body.get("actif");
        service.setActif(actif != null ? actif : !service.getActif());
        Service saved = serviceRepository.save(service);
        Map<String, Object> data = new HashMap<>();
        data.put("service", mapService(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
