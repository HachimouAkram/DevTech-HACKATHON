package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.dto.RendezVousResponse;
import com.terangacivil.backend.model.RendezVous;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.RendezVousRepository;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.security.UserDetailsImpl;
import com.terangacivil.backend.service.RendezVousService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rendez-vous")
public class RendezVousController {

    @Autowired
    private RendezVousService rendezVousService;

    @Autowired
    private RendezVousRepository rendezVousRepository;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return userRepository.findById(userDetails.getId()).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/disponibilites")
    public ResponseEntity<ApiResponse<List<LocalTime>>> getDisponibilites(
            @RequestParam("centreId") Integer centreId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<LocalTime> dispos = rendezVousService.getDisponibilites(centreId, date);
        return ResponseEntity.ok(ApiResponse.success(dispos));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RendezVousResponse>> reserver(@RequestBody Map<String, Object> payload) {
        Integer demandeId = Integer.parseInt(payload.get("demandeId").toString());
        Integer centreId = Integer.parseInt(payload.get("centreId").toString());
        LocalDate date = LocalDate.parse(payload.get("date").toString());
        LocalTime heure = LocalTime.parse(payload.get("heure").toString());

        RendezVous rv = rendezVousService.reserver(demandeId, centreId, date, heure);
        return ResponseEntity.ok(ApiResponse.success(new RendezVousResponse(rv)));
    }

    @GetMapping("/mes-rendez-vous")
    public ResponseEntity<ApiResponse<List<RendezVousResponse>>> getMesRendezVous() {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new IllegalArgumentException("Utilisateur non connecté");
        }
        
        List<RendezVous> rvs = rendezVousRepository.findByCitoyenId(currentUser.getId());
        List<RendezVousResponse> responses = rvs.stream().map(RendezVousResponse::new).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/agent")
    public ResponseEntity<ApiResponse<List<RendezVousResponse>>> getRendezVousAgent() {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new IllegalArgumentException("Utilisateur non connecté");
        }

        boolean isOfficerOrAbove = currentUser.hasPermission("GERER_GLOBAL") || 
                currentUser.hasPermission("GERER_REGION") || 
                currentUser.hasPermission("GERER_DEPARTEMENT") || 
                currentUser.hasPermission("GERER_COMMUNE") || 
                currentUser.hasPermission("GERER_CENTRE") || 
                currentUser.hasPermission("GERER_SERVICES");

        List<RendezVous> rvs;

        if (isOfficerOrAbove) {
            if (currentUser.getCentre() == null) {
                throw new IllegalArgumentException("Officier non assigné à un centre");
            }
            rvs = rendezVousRepository.findByCentreId(currentUser.getCentre().getId());
        } else {
            // C'est un agent simple (GERER_ACTIVITES)
            rvs = rendezVousRepository.findByDemandeAgentId(currentUser.getId());
        }

        List<RendezVousResponse> responses = rvs.stream().map(RendezVousResponse::new).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<ApiResponse<RendezVousResponse>> changerStatut(
            @PathVariable("id") Integer id,
            @RequestBody Map<String, String> payload) {
        String statut = payload.get("statut");
        RendezVous rv = rendezVousService.changerStatut(id, statut);
        return ResponseEntity.ok(ApiResponse.success(new RendezVousResponse(rv)));
    }

    @PatchMapping("/{id}/reporter")
    public ResponseEntity<ApiResponse<RendezVousResponse>> reporter(
            @PathVariable("id") Integer id,
            @RequestBody Map<String, String> payload) {
        LocalDate date = LocalDate.parse(payload.get("date"));
        LocalTime heure = LocalTime.parse(payload.get("heure"));

        RendezVous rv = rendezVousService.reporter(id, date, heure);
        return ResponseEntity.ok(ApiResponse.success(new RendezVousResponse(rv)));
    }
}
