package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.*;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.service.CurrentUserService;
import com.terangacivil.backend.service.DemandeService;
import com.terangacivil.backend.service.WorkflowService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/demandes")
public class DemandeController {

    @Autowired
    private DemandeService demandeService;

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDemandes(
            @RequestParam(value = "statut", required = false) String statut,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "archive", required = false) Boolean archive,
            @RequestParam(value = "startDate", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size) {

        User currentUser = currentUserService.getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("dateSoumission").descending());

        java.time.LocalDateTime start = startDate != null ? startDate.atStartOfDay() : null;
        java.time.LocalDateTime end = endDate != null ? endDate.atTime(java.time.LocalTime.MAX) : null;

        Page<DemandeResponse> demandesPage = demandeService.getDemandesForUser(currentUser, statut, search, archive, start, end, pageable);

        Map<String, Object> data = new HashMap<>();
        data.put("demandes", demandesPage.getContent());
        data.put("totalPages", demandesPage.getTotalPages());
        data.put("totalElements", demandesPage.getTotalElements());
        data.put("currentPage", demandesPage.getNumber());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PreAuthorize("hasAuthority('ROLE_USER')")
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDemande(@Valid @RequestBody DemandeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.createDemande(request, currentUserService.getCurrentUser()))));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateDemande(
            @PathVariable("id") Integer id,
            @Valid @RequestBody DemandeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.updateDemande(id, request, currentUserService.getCurrentUser()))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDemande(@PathVariable("id") Integer id) {
        demandeService.deleteDemande(id, currentUserService.getCurrentUser());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('ROLE_USER')")
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncDemandes(@RequestBody Map<String, Object> body) {
        List<Map<String, Object>> demandesMap = (List<Map<String, Object>>) body.get("demandes");
        return ResponseEntity.ok(ApiResponse.success(demandeService.syncDemandes(demandesMap, currentUserService.getCurrentUser())));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateDemandeStatus(
            @PathVariable("id") Integer id,
            @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.updateDemandeStatus(id, request, currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PutMapping("/{id}/workflow/progress")
    public ResponseEntity<ApiResponse<Map<String, Object>>> progressWorkflow(
            @PathVariable("id") Integer id,
            @RequestBody WorkflowCommentRequest request) {
        String commentaire = request != null && request.getCommentaire() != null ? request.getCommentaire() : "";
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", new DemandeResponse(workflowService.progressToNextStep(id, currentUserService.getCurrentUser().getId(), commentaire)))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PutMapping("/{id}/workflow/return")
    public ResponseEntity<ApiResponse<Map<String, Object>>> returnWorkflow(
            @PathVariable("id") Integer id,
            @RequestBody WorkflowCommentRequest request) {
        String commentaire = request != null && request.getCommentaire() != null ? request.getCommentaire() : "Retour pour correction";
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", new DemandeResponse(workflowService.returnForCorrection(id, currentUserService.getCurrentUser().getId(), commentaire)))));
    }

    @PreAuthorize("hasAuthority('ROLE_USER')")
    @PutMapping("/{id}/recours")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitRecours(
            @PathVariable("id") Integer id,
            @RequestBody DemandeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.submitRecours(id, request, currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PutMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleArchiveDemande(
            @PathVariable("id") Integer id,
            @RequestParam(value = "archive", required = true) Boolean archive) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.toggleArchive(id, archive, currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PostMapping("/{id}/generer-document")
    public ResponseEntity<ApiResponse<Map<String, Object>>> genererDocument(@PathVariable Integer id, @RequestParam("templateId") Integer templateId) {
        return ResponseEntity.ok(ApiResponse.success(demandeService.genererDocument(id, templateId, currentUserService.getCurrentUser())));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PostMapping("/{id}/upload-final-document")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadFinalDocument(@PathVariable Integer id, @RequestParam("url") String url) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.uploadFinalDocument(id, url))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PostMapping("/{id}/finaliser")
    public ResponseEntity<ApiResponse<Map<String, Object>>> finaliserDemande(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.finaliserDemande(id, currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES')")
    @PostMapping("/bulk-sign")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkSignDemandes() {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demandes", demandeService.bulkSign(currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PostMapping("/{id}/prendre-en-charge")
    public ResponseEntity<ApiResponse<Map<String, Object>>> prendreEnCharge(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.prendreEnCharge(id, currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PutMapping("/{id}/transfert/statut")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTransfertStatus(
            @PathVariable("id") Integer id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.updateTransfertStatus(id, (String) body.get("statut"), currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PutMapping("/{id}/transfert/expedier")
    public ResponseEntity<ApiResponse<Map<String, Object>>> expedierTransfert(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.expedierTransfert(id, currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @PostMapping("/{id}/transfert/message")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addTransfertMessage(
            @PathVariable("id") Integer id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("demande", demandeService.addTransfertMessage(id, (String) body.get("message"), currentUserService.getCurrentUser()))));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @GetMapping("/{id}/pdf")
    public ResponseEntity<?> getDemandePdf(@PathVariable("id") Integer id) {
        String generatedUrl = demandeService.getDemandePdfUrl(id, currentUserService.getCurrentUser());
        return ResponseEntity.status(302).header("Location", generatedUrl).build();
    }
}
