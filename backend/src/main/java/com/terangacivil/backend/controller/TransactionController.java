package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.Demande;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.DemandeRepository;
import com.terangacivil.backend.repository.DemandeSpecifications;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByIdWithActivities(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTransactions(
            @RequestParam(value = "modePaiement", required = false) String modePaiement,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "startDate", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {

        User currentUser = getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("dateSoumission").descending());

        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime end = endDate != null ? endDate.atTime(LocalTime.MAX) : null;

        // Build specification
        Specification<Demande> spec = Specification.where(DemandeSpecifications.filterByDashboardScope(currentUser))
                .and(DemandeSpecifications.hasPayment())
                .and(DemandeSpecifications.filterByPaymentMode(modePaiement))
                .and(DemandeSpecifications.searchContains(search))
                .and(DemandeSpecifications.betweenDates(start, end));

        // Get paginated results
        Page<Demande> transactionsPage = demandeRepository.findAll(spec, pageable);

        // Get all matching to calculate total revenue. Note: could be optimized later if volume is huge.
        List<Demande> allFiltered = demandeRepository.findAll(spec);
        long totalRevenue = allFiltered.stream()
                .filter(d -> d.getMontantPaye() != null)
                .mapToLong(Demande::getMontantPaye)
                .sum();

        // Convert to DTO
        List<Map<String, Object>> content = transactionsPage.getContent().stream().map(d -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", d.getId());
            map.put("reference", d.getReference());
            map.put("date", d.getDateSoumission());
            map.put("montant", d.getMontantPaye());
            map.put("modePaiement", d.getModePaiement());
            map.put("citoyen", d.getCitoyen() != null ? d.getCitoyen().getNomComplet() : "Inconnu");
            map.put("activite", d.getActivite() != null ? d.getActivite().getNom() : "Inconnu");
            map.put("statut", d.getStatut());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("transactions", content);
        data.put("totalRevenue", totalRevenue);
        data.put("totalElements", transactionsPage.getTotalElements());
        data.put("totalPages", transactionsPage.getTotalPages());
        data.put("currentPage", transactionsPage.getNumber());

        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
