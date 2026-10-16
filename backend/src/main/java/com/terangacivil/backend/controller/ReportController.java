package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import com.terangacivil.backend.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.terangacivil.backend.service.ReportService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private ReportService reportService;

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId()).orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
    }

    private Specification<Demande> getFilteredSpecification(User currentUser, LocalDateTime start, LocalDateTime end, Integer activityId) {
        Specification<Demande> spec = Specification.where(DemandeSpecifications.filterByDashboardScope(currentUser))
            .and(DemandeSpecifications.betweenDates(start, end));

        if (activityId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("activite").get("id"), activityId));
        }

        return spec;
    }

    @PreAuthorize("hasAuthority('GERER_BUREAU') or hasAuthority('GERER_CENTRE') or hasAuthority('GERER_COMMUNE') or hasAuthority('GERER_DEPARTEMENT') or hasAuthority('GERER_REGION') or hasAuthority('GERER_GLOBAL')")
    @GetMapping("/advanced")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdvancedReports(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @RequestParam(required = false) Integer activityId) {
        User currentUser = getCurrentUser();

        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime end = endDate != null ? endDate.atTime(LocalTime.MAX) : null;

        Map<String, Object> response = reportService.generateAdvancedReport(currentUser, start, end, activityId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PreAuthorize("hasAuthority('GERER_BUREAU') or hasAuthority('GERER_CENTRE') or hasAuthority('GERER_COMMUNE') or hasAuthority('GERER_DEPARTEMENT') or hasAuthority('GERER_REGION') or hasAuthority('GERER_GLOBAL')")
    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @RequestParam(required = false) Integer activityId) {

        User currentUser = getCurrentUser();

        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime end = endDate != null ? endDate.atTime(LocalTime.MAX) : null;

        Specification<Demande> spec = getFilteredSpecification(currentUser, start, end, activityId);
        List<Demande> demandes = demandeRepository.findAll(spec);

        StringBuilder csv = new StringBuilder();
        csv.append('\uFEFF');
        csv.append("Référence;Citoyen;Date Soumission;Statut;Actes Demandés;Commune;Centre;Agent Traitant\n");

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        for (Demande d : demandes) {
            String ref = d.getReference();
            String citoyen = d.getCitoyen() != null ? d.getCitoyen().getNomComplet() : "";
            String date = d.getDateSoumission() != null ? d.getDateSoumission().format(dtf) : "";
            String statut = d.getStatut();
            String actes = d.getActivite() != null ? d.getActivite().getNom() : "";
            String commune = d.getCommune() != null ? d.getCommune().getNom() : "";
            String centre = d.getCentre() != null ? d.getCentre().getNom() : "";
            String agent = d.getAgent() != null ? d.getAgent().getNomComplet() : "";

            csv.append(String.format("%s;%s;%s;%s;%s;%s;%s;%s\n",
                    escapeCsv(ref), escapeCsv(citoyen), escapeCsv(date), escapeCsv(statut),
                    escapeCsv(actes), escapeCsv(commune), escapeCsv(centre), escapeCsv(agent)));
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "rapport_demandes.csv");

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    private String escapeCsv(String data) {
        if (data == null) return "";
        data = data.replace("\"", "\"\"");
        if (data.contains(";") || data.contains("\"") || data.contains("\n")) {
            data = "\"" + data + "\"";
        }
        return data;
    }
}
