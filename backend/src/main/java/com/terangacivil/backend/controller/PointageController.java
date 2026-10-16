package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.dto.UserResponse;
import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pointage")
public class PointageController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfilRepository profilRepository;

    @Autowired
    private PointageRepository pointageRepository;

    @Autowired
    private PointageConfigRepository pointageConfigRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId()).orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
    }

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConfig() {
        User currentUser = getCurrentUser();
        Optional<PointageConfig> configOpt = Optional.empty();
        if (currentUser.getCentre() != null) {
            configOpt = pointageConfigRepository.findByCentreId(currentUser.getCentre().getId());
        } else if (currentUser.getBureau() != null) {
            configOpt = pointageConfigRepository.findByBureauId(currentUser.getBureau().getId());
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("L'administrateur n'est rattaché ni à un Centre ni à un Bureau"));
        }

        PointageConfig config;
        if (configOpt.isPresent()) {
            config = configOpt.get();
        } else {
            config = new PointageConfig();
            if (currentUser.getCentre() != null) {
                config.setCentre(currentUser.getCentre());
            } else {
                config.setBureau(currentUser.getBureau());
            }
            config = pointageConfigRepository.save(config);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("id", config.getId());
        data.put("heureOuverture", config.getHeureOuverture().toString());
        data.put("heureFermeture", config.getHeureFermeture().toString());
        data.put("heureLimiteArrivee", config.getHeureLimiteArrivee().toString());
        data.put("actif", config.getActif());
        if (config.getCentre() != null) data.put("centreId", config.getCentre().getId());
        if (config.getBureau() != null) data.put("bureauId", config.getBureau().getId());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/config")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateConfig(@RequestBody Map<String, Object> body) {
        User currentUser = getCurrentUser();
        Optional<PointageConfig> configOpt = Optional.empty();
        if (currentUser.getCentre() != null) {
            configOpt = pointageConfigRepository.findByCentreId(currentUser.getCentre().getId());
        } else if (currentUser.getBureau() != null) {
            configOpt = pointageConfigRepository.findByBureauId(currentUser.getBureau().getId());
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("L'administrateur n'est rattaché ni à un Centre ni à un Bureau"));
        }

        PointageConfig config;
        if (configOpt.isPresent()) {
            config = configOpt.get();
        } else {
            config = new PointageConfig();
            if (currentUser.getCentre() != null) {
                config.setCentre(currentUser.getCentre());
            } else {
                config.setBureau(currentUser.getBureau());
            }
        }

        if (body.containsKey("heureOuverture")) {
            config.setHeureOuverture(LocalTime.parse((String) body.get("heureOuverture")));
        }
        if (body.containsKey("heureFermeture")) {
            config.setHeureFermeture(LocalTime.parse((String) body.get("heureFermeture")));
        }
        if (body.containsKey("heureLimiteArrivee")) {
            config.setHeureLimiteArrivee(LocalTime.parse((String) body.get("heureLimiteArrivee")));
        }
        if (body.containsKey("actif")) {
            config.setActif((Boolean) body.get("actif"));
        }

        config = pointageConfigRepository.save(config);

        Map<String, Object> data = new HashMap<>();
        data.put("id", config.getId());
        data.put("heureOuverture", config.getHeureOuverture().toString());
        data.put("heureFermeture", config.getHeureFermeture().toString());
        data.put("heureLimiteArrivee", config.getHeureLimiteArrivee().toString());
        data.put("actif", config.getActif());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/agents")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAgents() {
        User currentUser = getCurrentUser();
        List<User> agents = new ArrayList<>();
        
        if (currentUser.getCentre() != null) {
            agents = userRepository.findByCentreIdAndPermission(currentUser.getCentre().getId(), "GERER_ACTIVITES");
        } else if (currentUser.getBureau() != null) {
            agents = userRepository.findByBureauIdAndPermission(currentUser.getBureau().getId(), "GERER_ACTIVITES");
        }

        List<UserResponse> responses = agents.stream().map(UserResponse::new).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PostMapping("/agents")
    public ResponseEntity<ApiResponse<UserResponse>> createAgent(@RequestBody Map<String, String> body) {
        User currentUser = getCurrentUser();

        String nomComplet = body.get("nom_complet");
        String telephone = body.get("telephone");
        String email = body.get("email");
        String password = body.get("password");

        if (nomComplet == null || nomComplet.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Le nom complet est obligatoire"));
        }
        if (telephone == null || telephone.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Le numéro de téléphone est obligatoire"));
        }
        if (userRepository.findByTelephone(telephone).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Ce numéro de téléphone est déjà utilisé"));
        }
        if (email != null && !email.isBlank() && userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Cet e-mail est déjà utilisé"));
        }

        User agent = new User();
        agent.setNomComplet(nomComplet);
        agent.setTelephone(telephone);
        agent.setEmail(email != null && !email.isBlank() ? email : null);
        
        String rawPassword = (password != null && !password.isBlank()) ? password : "password123";
        agent.setPasswordHash(passwordEncoder.encode(rawPassword));

        Profil profil = profilRepository.findByNom("AGENT")
                .orElseGet(() -> {
                    Profil p = new Profil();
                    p.setNom("AGENT");
                    p.setDescription("Agent de Bureau / Centre");
                    return profilRepository.save(p);
                });
        agent.setProfil(profil);
        agent.setActif(true);

        if (currentUser.getCentre() != null) {
            agent.setCentre(currentUser.getCentre());
        }
        if (currentUser.getBureau() != null) {
            agent.setBureau(currentUser.getBureau());
        }
        if (currentUser.getCommune() != null) {
            agent.setCommune(currentUser.getCommune());
        }

        User savedAgent = userRepository.save(agent);
        return ResponseEntity.ok(ApiResponse.success(new UserResponse(savedAgent)));
    }

    @GetMapping("/rapport")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRapport(
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        User currentUser = getCurrentUser();
        LocalDate targetDate = (date != null) ? date : LocalDate.now();

        List<User> agents = new ArrayList<>();
        if (currentUser.getCentre() != null) {
            agents = userRepository.findByCentreIdAndPermission(currentUser.getCentre().getId(), "GERER_ACTIVITES");
        } else if (currentUser.getBureau() != null) {
            agents = userRepository.findByBureauIdAndPermission(currentUser.getBureau().getId(), "GERER_ACTIVITES");
        }

        List<Pointage> pointages = new ArrayList<>();
        if (currentUser.getCentre() != null) {
            pointages = pointageRepository.findByCentreIdAndDate(currentUser.getCentre().getId(), targetDate);
        } else if (currentUser.getBureau() != null) {
            pointages = pointageRepository.findByBureauIdAndDate(currentUser.getBureau().getId(), targetDate);
        }

        Map<Integer, Pointage> pointageMap = new HashMap<>();
        for (Pointage p : pointages) {
            if (p.getUser() != null) {
                pointageMap.put(p.getUser().getId(), p);
            }
        }

        List<Map<String, Object>> rapport = new ArrayList<>();
        for (User agent : agents) {
            Map<String, Object> item = new HashMap<>();
            item.put("agentId", agent.getId());
            item.put("nomComplet", agent.getNomComplet());
            item.put("telephone", agent.getTelephone());
            item.put("email", agent.getEmail());
            item.put("avatarUrl", agent.getAvatarUrl());

            Pointage p = pointageMap.get(agent.getId());
            if (p != null) {
                item.put("heureArrivee", p.getHeureArrivee() != null ? p.getHeureArrivee().toString() : null);
                item.put("heureDepart", p.getHeureDepart() != null ? p.getHeureDepart().toString() : null);
                item.put("statut", p.getStatut());
            } else {
                item.put("heureArrivee", null);
                item.put("heureDepart", null);
                item.put("statut", "ABSENT");
            }
            rapport.add(item);
        }

        return ResponseEntity.ok(ApiResponse.success(rapport));
    }
}
