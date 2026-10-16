package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import com.terangacivil.backend.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RegionRepository regionRepository;

    @Autowired
    private DepartementRepository departementRepository;

    @Autowired
    private CommuneRepository communeRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private EntityManager entityManager;

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId()).orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
    }

    @GetMapping("/kpis")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getKpis() {
        User currentUser = getCurrentUser();
        Map<String, Object> data = new HashMap<>();

        Specification<Demande> spec = DemandeSpecifications.filterByDashboardScope(currentUser);

        long total = demandeRepository.count(spec);
        long pending = demandeRepository.count(spec.and((root, query, cb) -> root.get("statut").in("en_attente", "en_cours", "verification_dossier", "en_traitement", "recours")));
        long validated = demandeRepository.count(spec.and(DemandeSpecifications.hasStatut("valide")));
        long rejected = demandeRepository.count(spec.and(DemandeSpecifications.hasStatut("rejete")));
        long signatureCount = demandeRepository.count(spec.and(DemandeSpecifications.hasStatut("signature")));

        Double finalSatisfaction = null;
        try {
            jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
            jakarta.persistence.criteria.CriteriaQuery<Double> cq = cb.createQuery(Double.class);
            jakarta.persistence.criteria.Root<Demande> root = cq.from(Demande.class);
            cq.select(cb.avg(root.get("evaluationScore")));
            cq.where(spec.toPredicate(root, cq, cb), cb.isNotNull(root.get("evaluationScore")));
            Double avgScore = entityManager.createQuery(cq).getSingleResult();
            if (avgScore != null) {
                finalSatisfaction = Math.round((avgScore / 5.0) * 100.0 * 10.0) / 10.0;
            }
        } catch (Exception e) {}
        data.put("satisfactionRate", finalSatisfaction);

        Map<String, Object> demandesStats = new HashMap<>();
        demandesStats.put("total", total);
        demandesStats.put("pending", pending);
        demandesStats.put("validated", validated);

        data.put("demandes", demandesStats);

        List<Map<String, Object>> cards = new ArrayList<>();

        if (currentUser.hasPermission("GERER_GLOBAL")) {
            data.put("title", "Vue d'ensemble nationale (ANEC)");

            long regionCount = regionRepository.count();
            long deptCount = departementRepository.count();
            long communeCount = communeRepository.count();
            long activeUserCount = userRepository.countByActifTrue();

            cards.add(createCard("Régions administrées", regionCount, "primary"));
            cards.add(createCard("Départements cartographiés", deptCount, "info"));
            cards.add(createCard("Communes connectées", communeCount, "success"));
            cards.add(createCard("Utilisateurs Actifs", activeUserCount, "warning"));
            cards.add(createCard("Total Demandes Nationales", total, "primary"));
            cards.add(createCard("Dossiers Validés", validated, "success"));
            cards.add(createCard("Dossiers en Attente", pending, "warning"));

        } else if (currentUser.hasPermission("GERER_COMMUNE")) {
            Commune commune = currentUser.getCommune();
            String communeNom = commune != null ? commune.getNom() : "Non spécifié";
            data.put("title", "Statistiques de la Commune de " + communeNom);

            long offCount = userRepository.countByCommuneIdAndPermission(commune.getId(), "GERER_SERVICES");
            long agtCount = userRepository.countByCommuneIdAndPermission(commune.getId(), "GERER_ACTIVITES");

            cards.add(createCard("Officiers d'État Civil", offCount, "primary"));
            cards.add(createCard("Agents de Terrain", agtCount, "info"));
            cards.add(createCard("Actes Civils Déclarés", total, "success"));
            cards.add(createCard("Dossiers en Attente", pending, "warning"));
            cards.add(createCard("Demandes rejetées", rejected, "danger"));

        } else if (currentUser.hasPermission("GERER_CENTRE") || currentUser.hasPermission("GERER_BUREAU")) {
            Centre centre = currentUser.getCentre();
            String centreNom = centre != null ? centre.getNom() : "Non spécifié";
            data.put("title", "Centre d'État Civil: " + centreNom);

            long agtCount = 0;
            if (centre != null) {
                agtCount = userRepository.countByCentreIdAndPermission(centre.getId(), "GERER_ACTIVITES");
            }

            cards.add(createCard("Agents rattachés", agtCount, "info"));
            cards.add(createCard("En attente de signature", signatureCount, "danger"));
            cards.add(createCard("Dossiers Validés", validated, "success"));
            cards.add(createCard("Dossiers en Attente", pending, "warning"));
            cards.add(createCard("Demandes rejetées", rejected, "danger"));

        } else if (currentUser.hasPermission("GERER_SERVICES")) {
            data.put("title", "Suivi d'activité - Responsable de Service");

            cards.add(createCard("Dossiers assignés", total, "info"));
            cards.add(createCard("En Attente de traitement", pending, "warning"));
            cards.add(createCard("En attente de signature", signatureCount, "danger"));
            cards.add(createCard("Dossiers Validés", validated, "success"));
            cards.add(createCard("Demandes rejetées", rejected, "danger"));
        } else if (currentUser.hasPermission("GERER_ACTIVITES")) {
            Centre centre = currentUser.getCentre();
            String centreNom = centre != null ? centre.getNom() : "Non spécifié";
            data.put("title", "Espace Agent - Centre d'État Civil: " + centreNom);

            long treatedByMe = demandeRepository.count(spec.and((root, query, cb) -> cb.equal(root.get("agent").get("id"), currentUser.getId())));
            long pendingToTreat = pending;
            
            // To compute expired safely without memory overload, we fetch pending only
            List<Demande> pendingDemandes = demandeRepository.findAll(spec.and((root, query, cb) -> root.get("statut").in("en_attente", "en_cours", "verification_dossier", "en_traitement", "recours")));
            long expiredCount = pendingDemandes.stream().filter(Demande::isExpired).count();

            cards.add(createCard("Total demandes", total, "primary"));
            cards.add(createCard("Dossiers traités par moi", treatedByMe, "success"));
            cards.add(createCard("Reste à traiter", pendingToTreat, "warning"));
            cards.add(createCard("Dossiers hors délai (expirés)", expiredCount, "danger"));
        }

        data.put("cards", cards);

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    private Map<String, Object> createCard(String label, Object value, String type) {
        Map<String, Object> m = new HashMap<>();
        m.put("label", label);
        m.put("value", value);
        m.put("type", type);
        return m;
    }

    @GetMapping("/chart")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getChartData(
            @RequestParam(defaultValue = "month") String filter) {
        
        User currentUser = getCurrentUser();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate;
        boolean groupByMonth = false;

        switch (filter) {
            case "7days":
                startDate = now.minusDays(7);
                break;
            case "month":
                startDate = now.minusMonths(1);
                break;
            case "6months":
                startDate = now.minusMonths(6);
                groupByMonth = true;
                break;
            case "12months":
                startDate = now.minusMonths(12);
                groupByMonth = true;
                break;
            case "year":
                startDate = now.withDayOfYear(1).withHour(0).withMinute(0);
                groupByMonth = true;
                break;
            case "all":
            default:
                startDate = now.minusYears(100);
                groupByMonth = true;
                break;
        }

        Specification<Demande> spec = DemandeSpecifications.filterByDashboardScope(currentUser)
                .and(DemandeSpecifications.betweenDates(startDate, now));

        Map<String, Map<String, Integer>> grouped = new TreeMap<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        DateTimeFormatter displayDayFormatter = DateTimeFormatter.ofPattern("dd/MM");
        DateTimeFormatter displayMonthFormatter = DateTimeFormatter.ofPattern("MM/yyyy");

        try {
            jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
            jakarta.persistence.criteria.CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            jakarta.persistence.criteria.Root<Demande> root = cq.from(Demande.class);
            
            cq.multiselect(root.get("dateSoumission"), root.get("statut"));
            cq.where(spec.toPredicate(root, cq, cb));
            
            List<Object[]> results = entityManager.createQuery(cq).getResultList();
            
            for (Object[] row : results) {
                LocalDateTime dDate = (LocalDateTime) row[0];
                String statut = (String) row[1];
                if (dDate == null) continue;
                
                String sortKey = groupByMonth ? dDate.format(monthFormatter) : dDate.format(dayFormatter);
                String displayDate = groupByMonth ? dDate.format(displayMonthFormatter) : dDate.format(displayDayFormatter);
                
                grouped.putIfAbsent(sortKey, new HashMap<>());
                Map<String, Integer> counts = grouped.get(sortKey);
                counts.putIfAbsent("soumis", 0);
                counts.putIfAbsent("valides", 0);
                counts.putIfAbsent("rejetes", 0);
                
                counts.put("soumis", counts.get("soumis") + 1);
                
                if ("valide".equalsIgnoreCase(statut)) {
                    counts.put("valides", counts.get("valides") + 1);
                } else if ("rejete".equalsIgnoreCase(statut)) {
                    counts.put("rejetes", counts.get("rejetes") + 1);
                }
            }
        } catch(Exception e) {
            e.printStackTrace();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Map<String, Integer>> entry : grouped.entrySet()) {
            Map<String, Object> point = new HashMap<>();
            
            String display;
            if (groupByMonth) {
                String[] parts = entry.getKey().split("-");
                display = parts[1] + "/" + parts[0];
            } else {
                String[] parts = entry.getKey().split("-");
                display = parts[2] + "/" + parts[1];
            }
            
            point.put("date", display);
            point.put("soumis", entry.getValue().get("soumis"));
            point.put("valides", entry.getValue().get("valides"));
            point.put("rejetes", entry.getValue().get("rejetes"));
            result.add(point);
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/role-charts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRoleChartsData() {
        User currentUser = getCurrentUser();
        Map<String, Object> data = new HashMap<>();

        if (currentUser.hasPermission("GERER_GLOBAL")) {
            // Communes les plus Performantes
            String q1 = "SELECT c.nom, COUNT(d.id) FROM Demande d JOIN d.commune c GROUP BY c.nom ORDER BY COUNT(d.id) DESC";
            List<Object[]> res1 = entityManager.createQuery(q1, Object[].class).setMaxResults(6).getResultList();
            List<Map<String, Object>> communeData = new ArrayList<>();
            String[] colors = {"#10b981", "#3b82f6", "#fbbf24", "#6366f1", "#ef4444", "#8b5cf6"};
            int i = 0;
            for (Object[] row : res1) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                map.put("demandes", row[1]);
                map.put("fill", colors[i % colors.length]);
                communeData.add(map);
                i++;
            }
            data.put("communeData", communeData);

            // Répartition Nationale par Région
            String q2 = "SELECT r.nom, COUNT(d.id) FROM Demande d JOIN d.commune c JOIN c.departement dept JOIN dept.region r GROUP BY r.nom ORDER BY COUNT(d.id) DESC";
            List<Object[]> res2 = entityManager.createQuery(q2, Object[].class).setMaxResults(5).getResultList();
            List<Map<String, Object>> regionData = new ArrayList<>();
            for (Object[] row : res2) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                map.put("demandes", row[1]);
                regionData.add(map);
            }
            data.put("regionData", regionData);

        } else if (currentUser.hasPermission("GERER_COMMUNE")) {
            Commune commune = currentUser.getCommune();
            Integer communeId = commune != null ? commune.getId() : -1;

            // 1. Performance par Service (servicePerformanceData)
            String qService = "SELECT s.nom, COUNT(d.id), SUM(CASE WHEN d.statut = 'valide' THEN 1 ELSE 0 END) FROM Demande d JOIN d.activite a JOIN a.service s WHERE d.commune.id = :communeId GROUP BY s.nom ORDER BY COUNT(d.id) DESC";
            List<Object[]> resService = entityManager.createQuery(qService, Object[].class).setParameter("communeId", communeId).setMaxResults(6).getResultList();
            List<Map<String, Object>> servicePerformanceData = new ArrayList<>();
            for (Object[] row : resService) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                long totalDossiers = ((Number) row[1]).longValue();
                long valides = row[2] != null ? ((Number) row[2]).longValue() : 0;
                map.put("dossiers", totalDossiers);
                map.put("rate", totalDossiers > 0 ? Math.round((valides * 100.0) / totalDossiers) : 0);
                servicePerformanceData.add(map);
            }
            data.put("servicePerformanceData", servicePerformanceData);

            // 2. Proportion des Types d'Actes (topDemarchesData)
            String qTypeActe = "SELECT a.nom, COUNT(d.id) FROM Demande d JOIN d.activite a WHERE d.commune.id = :communeId GROUP BY a.nom ORDER BY COUNT(d.id) DESC";
            List<Object[]> resTypeActe = entityManager.createQuery(qTypeActe, Object[].class).setParameter("communeId", communeId).setMaxResults(5).getResultList();
            List<Map<String, Object>> topDemarchesData = new ArrayList<>();
            String[] colors = {"#3b82f6", "#f59e0b", "#fbbf24", "#ef4444", "#8b5cf6"};
            int iType = 0;
            for (Object[] row : resTypeActe) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                map.put("value", row[1]);
                map.put("fill", colors[iType % colors.length]);
                topDemarchesData.add(map);
                iType++;
            }
            data.put("topDemarchesData", topDemarchesData);

            // 3. Top Officiers (basé sur permissions GERER_CENTRE/GERER_SERVICES)
            String qOfficiers = "SELECT u.nomComplet, COUNT(d.id) FROM Demande d JOIN d.officier u JOIN u.profil.permissions p WHERE p.nom IN ('GERER_SERVICES', 'GERER_CENTRE') AND d.commune.id = :communeId AND d.statut IN ('valide', 'valide_cloture') GROUP BY u.nomComplet ORDER BY COUNT(d.id) DESC";
            List<Object[]> resOfficiers = entityManager.createQuery(qOfficiers, Object[].class).setParameter("communeId", communeId).setMaxResults(4).getResultList();
            List<Map<String, Object>> topOfficersData = new ArrayList<>();
            String[] offColors = {"#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"};
            int iOff = 0;
            for (Object[] row : resOfficiers) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                map.put("dossiers", row[1]);
                map.put("fill", offColors[iOff % offColors.length]);
                topOfficersData.add(map);
                iOff++;
            }
            data.put("topOfficersData", topOfficersData);

            // 4. Top Agents (basé sur permission GERER_ACTIVITES)
            String qAgents = "SELECT u.nomComplet, COUNT(d.id), SUM(CASE WHEN d.statut = 'valide' THEN 1 ELSE 0 END) FROM Demande d JOIN d.agent u JOIN u.profil.permissions p WHERE p.nom = 'GERER_ACTIVITES' AND d.commune.id = :communeId GROUP BY u.nomComplet ORDER BY COUNT(d.id) DESC";
            List<Object[]> resAgents = entityManager.createQuery(qAgents, Object[].class).setParameter("communeId", communeId).setMaxResults(5).getResultList();
            List<Map<String, Object>> topAgentsData = new ArrayList<>();
            int iAgt = 0;
            for (Object[] row : resAgents) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                long totalDossiers = ((Number) row[1]).longValue();
                long valides = row[2] != null ? ((Number) row[2]).longValue() : 0;
                map.put("dossiers", totalDossiers);
                map.put("rate", totalDossiers > 0 ? Math.round((valides * 100.0) / totalDossiers) : 0);
                map.put("fill", iAgt == 0 ? "#10b981" : "#3b82f6");
                if (iAgt == 0) map.put("isTop", true);
                topAgentsData.add(map);
                iAgt++;
            }
            data.put("topAgentsData", topAgentsData);

        } else if (currentUser.hasPermission("GERER_CENTRE") || currentUser.hasPermission("GERER_BUREAU")) {
            Centre centre = currentUser.getCentre();
            Integer centreId = centre != null ? centre.getId() : -1;

            // 1. Agents Performants (via permission GERER_ACTIVITES)
            String q1 = "SELECT u.nomComplet, COUNT(d.id) FROM Demande d JOIN d.agent u JOIN u.profil.permissions p WHERE p.nom = 'GERER_ACTIVITES' AND d.statut IN ('valide', 'valide_cloture') AND d.centre.id = :centreId GROUP BY u.nomComplet ORDER BY COUNT(d.id) DESC";
            List<Object[]> res1 = entityManager.createQuery(q1, Object[].class).setParameter("centreId", centreId).setMaxResults(5).getResultList();
            List<Map<String, Object>> agentPerformance = new ArrayList<>();
            String[] colors = {"#10b981", "#3b82f6", "#fbbf24", "#6366f1", "#ef4444"};
            int i = 0;
            for (Object[] row : res1) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                map.put("dossiers", row[1]);
                map.put("fill", colors[i % colors.length]);
                agentPerformance.add(map);
                i++;
            }
            data.put("agentPerformance", agentPerformance);

            // 2. Validation history
            LocalDateTime startDate = LocalDateTime.now().minusMonths(4).withDayOfMonth(1).withHour(0).withMinute(0);
            String q2 = "SELECT d.dateSoumission, d.statut FROM Demande d WHERE d.centre.id = :centreId AND d.dateSoumission >= :startDate";
            List<Object[]> res2 = entityManager.createQuery(q2, Object[].class).setParameter("centreId", centreId).setParameter("startDate", startDate).getResultList();
            
            Map<String, int[]> monthStats = new TreeMap<>();
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM", Locale.FRENCH);
            DateTimeFormatter sortFmt = DateTimeFormatter.ofPattern("yyyy-MM");
            for (Object[] row : res2) {
                LocalDateTime d = (LocalDateTime) row[0];
                String s = (String) row[1];
                if (d == null) continue;
                String k = d.format(sortFmt);
                monthStats.putIfAbsent(k, new int[2]);
                monthStats.get(k)[0]++;
                if ("valide".equalsIgnoreCase(s) || "valide_cloture".equalsIgnoreCase(s)) monthStats.get(k)[1]++;
            }
            
            List<Map<String, Object>> validationHistory = new ArrayList<>();
            for (Map.Entry<String, int[]> entry : monthStats.entrySet()) {
                Map<String, Object> map = new HashMap<>();
                String[] parts = entry.getKey().split("-");
                LocalDateTime monthDate = LocalDateTime.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), 1, 0, 0);
                String displayMonth = monthDate.format(fmt);
                displayMonth = displayMonth.substring(0, 1).toUpperCase() + displayMonth.substring(1, Math.min(3, displayMonth.length()));
                int total = entry.getValue()[0];
                int valides = entry.getValue()[1];
                double rate = total == 0 ? 0 : Math.round((valides * 100.0 / total) * 10.0) / 10.0;
                map.put("month", displayMonth);
                map.put("rate", rate);
                validationHistory.add(map);
            }
            data.put("validationHistory", validationHistory);

            // 3. Proportion des Types d'Actes
            String qTypeActe = "SELECT a.nom, COUNT(d.id) FROM Demande d JOIN d.activite a WHERE d.centre.id = :centreId GROUP BY a.nom ORDER BY COUNT(d.id) DESC";
            List<Object[]> resTypeActe = entityManager.createQuery(qTypeActe, Object[].class).setParameter("centreId", centreId).setMaxResults(5).getResultList();
            List<Map<String, Object>> typeActeData = new ArrayList<>();
            String[] typeColors = {"#3b82f6", "#f59e0b", "#fbbf24", "#ef4444", "#8b5cf6"};
            int iType = 0;
            for (Object[] row : resTypeActe) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", row[0]);
                map.put("value", row[1]);
                map.put("fill", typeColors[iType % typeColors.length]);
                typeActeData.add(map);
                iType++;
            }
            data.put("typeActeData", typeActeData);

            // 4. Status Data (Répartition des statuts)
            String qStatus = "SELECT d.statut, COUNT(d.id) FROM Demande d WHERE d.centre.id = :centreId GROUP BY d.statut";
            List<Object[]> resStatus = entityManager.createQuery(qStatus, Object[].class).setParameter("centreId", centreId).getResultList();
            List<Map<String, Object>> statusData = new ArrayList<>();
            Map<String, String> statusMap = new HashMap<>();
            statusMap.put("valide", "Validés"); statusMap.put("valide_cloture", "Clôturés");
            statusMap.put("rejete", "Rejetés"); statusMap.put("en_attente", "En attente");
            statusMap.put("en_cours", "En cours"); statusMap.put("signature", "À signer");
            Map<String, String> colorMap = new HashMap<>();
            colorMap.put("valide", "#10b981"); colorMap.put("valide_cloture", "#10b981");
            colorMap.put("rejete", "#ef4444"); colorMap.put("en_attente", "#3b82f6");
            colorMap.put("en_cours", "#f59e0b"); colorMap.put("signature", "#8b5cf6");
            
            for (Object[] row : resStatus) {
                String statut = (String) row[0];
                Long count = (Long) row[1];
                Map<String, Object> map = new HashMap<>();
                map.put("name", statusMap.getOrDefault(statut.toLowerCase(), statut));
                map.put("value", count);
                map.put("fill", colorMap.getOrDefault(statut.toLowerCase(), "#6b7280"));
                statusData.add(map);
            }
            data.put("statusData", statusData);

            // 5. General Evolution Data (Évolution 10 derniers jours)
            LocalDateTime startDateEvol = LocalDateTime.now().minusDays(9).withHour(0).withMinute(0);
            String qEvol = "SELECT d.dateSoumission, d.statut FROM Demande d WHERE d.centre.id = :centreId AND d.dateSoumission >= :startDateEvol";
            List<Object[]> resEvol = entityManager.createQuery(qEvol, Object[].class).setParameter("centreId", centreId).setParameter("startDateEvol", startDateEvol).getResultList();
            
            Map<String, int[]> evolStats = new LinkedHashMap<>();
            DateTimeFormatter dayFmtEvol = DateTimeFormatter.ofPattern("dd/MM");
            for (int j = 9; j >= 0; j--) {
                String dayName = LocalDateTime.now().minusDays(j).format(dayFmtEvol);
                evolStats.put(dayName, new int[3]); // 0: soumis, 1: valides, 2: rejetes
            }
            for (Object[] row : resEvol) {
                LocalDateTime d = (LocalDateTime) row[0];
                String s = (String) row[1];
                if (d == null) continue;
                String k = d.format(dayFmtEvol);
                if (evolStats.containsKey(k)) {
                    evolStats.get(k)[0]++;
                    if ("valide".equalsIgnoreCase(s) || "valide_cloture".equalsIgnoreCase(s)) evolStats.get(k)[1]++;
                    if ("rejete".equalsIgnoreCase(s)) evolStats.get(k)[2]++;
                }
            }
            List<Map<String, Object>> generalEvolutionData = new ArrayList<>();
            for (Map.Entry<String, int[]> entry : evolStats.entrySet()) {
                Map<String, Object> map = new HashMap<>();
                map.put("date", entry.getKey());
                map.put("soumis", entry.getValue()[0]);
                map.put("valides", entry.getValue()[1]);
                map.put("rejetes", entry.getValue()[2]);
                generalEvolutionData.add(map);
            }
            data.put("generalEvolutionData", generalEvolutionData);

        } else {
            // default agent
            Integer agentId = currentUser.getId();

            // Statut de Mes Dossiers
            String q1 = "SELECT d.statut, COUNT(d.id) FROM Demande d WHERE d.agent.id = :agentId GROUP BY d.statut";
            List<Object[]> res1 = entityManager.createQuery(q1, Object[].class).setParameter("agentId", agentId).getResultList();
            List<Map<String, Object>> agentDossiers = new ArrayList<>();
            Map<String, String> statusMap = new HashMap<>();
            statusMap.put("valide", "Validés");
            statusMap.put("rejete", "Rejetés");
            Map<String, String> colorMap = new HashMap<>();
            colorMap.put("valide", "#10b981");
            colorMap.put("rejete", "#ef4444");
            
            int enCoursCount = 0;
            for (Object[] row : res1) {
                String statut = (String) row[0];
                Long count = (Long) row[1];
                if ("valide".equalsIgnoreCase(statut) || "rejete".equalsIgnoreCase(statut)) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", statusMap.get(statut.toLowerCase()));
                    map.put("value", count);
                    map.put("fill", colorMap.get(statut.toLowerCase()));
                    agentDossiers.add(map);
                } else {
                    enCoursCount += count;
                }
            }
            if (enCoursCount > 0) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", "En cours");
                map.put("value", enCoursCount);
                map.put("fill", "#3b82f6");
                agentDossiers.add(map);
            }
            // Add empty chart states if no data
            if (agentDossiers.isEmpty()) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", "Aucun");
                map.put("value", 1);
                map.put("fill", "#e5e7eb");
                agentDossiers.add(map);
            }
            data.put("agentDossiers", agentDossiers);

            // Productivité Quotidienne
            LocalDateTime startDate = LocalDateTime.now().minusDays(7).withHour(0).withMinute(0);
            String q2 = "SELECT d.dateSoumission, d.statut FROM Demande d WHERE d.agent.id = :agentId AND d.dateSoumission >= :startDate AND d.statut IN ('valide', 'rejete')";
            
            List<Object[]> res2 = entityManager.createQuery(q2, Object[].class)
                .setParameter("agentId", agentId)
                .setParameter("startDate", startDate)
                .getResultList();
            
            Map<String, Integer> dayStats = new LinkedHashMap<>();
            DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("EEE", Locale.FRENCH);
            
            for (int j = 6; j >= 0; j--) {
                LocalDateTime d = LocalDateTime.now().minusDays(j);
                String dayName = d.format(dayFmt);
                dayName = dayName.substring(0, 1).toUpperCase() + dayName.substring(1, Math.min(3, dayName.length()));
                dayStats.put(dayName, 0);
            }
            
            for (Object[] row : res2) {
                LocalDateTime d = (LocalDateTime) row[0];
                if (d == null) continue;
                String dayName = d.format(dayFmt);
                dayName = dayName.substring(0, 1).toUpperCase() + dayName.substring(1, Math.min(3, dayName.length()));
                if (dayStats.containsKey(dayName)) {
                    dayStats.put(dayName, dayStats.get(dayName) + 1);
                }
            }
            
            List<Map<String, Object>> agentProductivity = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : dayStats.entrySet()) {
                Map<String, Object> map = new HashMap<>();
                map.put("day", entry.getKey());
                map.put("dossiers", entry.getValue());
                agentProductivity.add(map);
            }
            data.put("agentProductivity", agentProductivity);
        }

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/activites")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDernieresActivites() {
        User currentUser = getCurrentUser();
        Specification<Demande> spec = DemandeSpecifications.filterByDashboardScope(currentUser);
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 5, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        
        org.springframework.data.domain.Page<Demande> page = demandeRepository.findAll(spec, pageable);
        
        List<Map<String, Object>> activities = new ArrayList<>();
        for (Demande d : page.getContent()) {
            Map<String, Object> act = new HashMap<>();
            
            String statut = d.getStatut() != null ? d.getStatut().toLowerCase() : "";
            String type = "Demande";
            String color = "blue";
            String desc = "Nouvelle demande " + (d.getActivite() != null ? d.getActivite().getNom() : "") + " (" + d.getReference() + ")";
            
            if ("valide".equals(statut)) {
                type = "Validation";
                color = "green";
                desc = "Dossier " + d.getReference() + " validé";
            } else if ("rejete".equals(statut)) {
                type = "Rejet";
                color = "red";
                desc = "Dossier " + d.getReference() + " refusé";
            } else if ("signature".equals(statut)) {
                type = "Signature";
                color = "orange";
                desc = "Dossier " + d.getReference() + " en attente de signature";
            } else if ("en_cours".equals(statut) || "en_traitement".equals(statut)) {
                type = "Traitement";
                color = "blue";
                desc = "Dossier " + d.getReference() + " en cours de traitement";
            }
            
            act.put("id", d.getId());
            act.put("type", type);
            act.put("color", color);
            act.put("description", desc);
            
            LocalDateTime heure = d.getDateSoumission();
            if ("valide".equals(statut) && d.getDateValidation() != null) heure = d.getDateValidation();
            act.put("heure", heure);
            
            activities.add(act);
        }
        
        return ResponseEntity.ok(ApiResponse.success(activities));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTransactions(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String modePaiement,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search
    ) {
        User currentUser = getCurrentUser();
        
        if (currentUser.hasPermission("GERER_GLOBAL")) {
            return ResponseEntity.status(403).body(ApiResponse.error("Accès refusé. Les administrateurs nationaux ne peuvent pas consulter les transactions."));
        }

        Specification<Demande> spec = DemandeSpecifications.filterByDashboardScope(currentUser);
        
        spec = spec.and((root, query, cb) -> cb.isNotNull(root.get("montantPaye")));
        spec = spec.and((root, query, cb) -> cb.gt(root.get("montantPaye"), 0));

        if (modePaiement != null && !modePaiement.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("modePaiement"), modePaiement));
        }

        LocalDateTime now = LocalDateTime.now();
        if ("today".equalsIgnoreCase(period)) {
            LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dateSoumission"), startOfDay));
        } else if ("this_week".equalsIgnoreCase(period)) {
            LocalDateTime startOfWeek = now.minusDays(now.getDayOfWeek().getValue() - 1).toLocalDate().atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dateSoumission"), startOfWeek));
        } else if ("this_month".equalsIgnoreCase(period)) {
            LocalDateTime startOfMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dateSoumission"), startOfMonth));
        }

        if (search != null && !search.isEmpty()) {
            String likeSearch = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("reference")), likeSearch),
                cb.like(cb.lower(root.join("citoyen", jakarta.persistence.criteria.JoinType.LEFT).get("nom")), likeSearch),
                cb.like(cb.lower(root.join("citoyen", jakarta.persistence.criteria.JoinType.LEFT).get("prenom")), likeSearch)
            ));
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "dateSoumission"));
        
        org.springframework.data.domain.Page<Demande> demandePage = demandeRepository.findAll(spec, pageable);
        
        // Compute total revenue based on the same spec but without pagination
        List<Demande> allDemandes = demandeRepository.findAll(spec);
        long totalRevenue = allDemandes.stream().filter(d -> d.getMontantPaye() != null).mapToLong(Demande::getMontantPaye).sum();
        
        List<Map<String, Object>> transactionsList = new ArrayList<>();
        for (Demande d : demandePage.getContent()) {
            Map<String, Object> t = new HashMap<>();
            t.put("id", d.getId());
            t.put("reference", d.getReference());
            t.put("montant", d.getMontantPaye());
            t.put("modePaiement", d.getModePaiement());
            t.put("date", d.getDateSoumission());
            t.put("citoyen", d.getCitoyen() != null ? d.getCitoyen().getNomComplet() : "");
            t.put("activite", d.getActivite() != null ? d.getActivite().getNom() : "");
            transactionsList.add(t);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalRevenue", totalRevenue);
        result.put("totalElements", demandePage.getTotalElements());
        result.put("transactions", transactionsList);

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
