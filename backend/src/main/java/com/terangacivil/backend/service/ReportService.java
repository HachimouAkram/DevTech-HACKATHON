package com.terangacivil.backend.service;

import com.terangacivil.backend.model.Demande;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.DemandeRepository;
import com.terangacivil.backend.repository.DemandeSpecifications;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ReportService {

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private EntityManager entityManager;

    public Map<String, Object> generateAdvancedReport(User currentUser, LocalDateTime start, LocalDateTime end, Integer activityId) {
        Specification<Demande> spec = Specification.where(DemandeSpecifications.filterByDashboardScope(currentUser))
                .and(DemandeSpecifications.betweenDates(start, end));

        if (activityId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("activite").get("id"), activityId));
        }

        Map<String, Object> response = new HashMap<>();

        long totalDemandes = demandeRepository.count(spec);
        long rejectedCount = demandeRepository.count(spec.and(DemandeSpecifications.hasStatut("rejete")));
        long validatedCount = demandeRepository.count(spec.and(DemandeSpecifications.hasStatut("valide")));
        long pending = demandeRepository.count(spec.and((root, query, cb) -> root.get("statut").in("en_attente", "en_cours")));
        long signature = demandeRepository.count(spec.and(DemandeSpecifications.hasStatut("signature")));

        double satisfactionRate = 0.0;
        try {
            jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
            jakarta.persistence.criteria.CriteriaQuery<Double> cq = cb.createQuery(Double.class);
            jakarta.persistence.criteria.Root<Demande> root = cq.from(Demande.class);
            cq.select(cb.avg(root.get("evaluationScore")));
            cq.where(spec.toPredicate(root, cq, cb), cb.isNotNull(root.get("evaluationScore")));
            Double avgScore = entityManager.createQuery(cq).getSingleResult();
            if (avgScore != null) {
                satisfactionRate = Math.round((avgScore / 5.0) * 100.0 * 10.0) / 10.0;
            }
        } catch (Exception e) {}

        response.put("totalDemandes", totalDemandes);
        response.put("rejetCount", rejectedCount);
        response.put("avgProcessingTime", "N/A");
        response.put("satisfactionRate", satisfactionRate);

        try {
            jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
            jakarta.persistence.criteria.CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            jakarta.persistence.criteria.Root<Demande> root = cq.from(Demande.class);

            cq.multiselect(root.get("activite").get("nom"), cb.count(root));
            cq.where(spec.toPredicate(root, cq, cb));
            cq.groupBy(root.get("activite").get("nom"));
            cq.orderBy(cb.desc(cb.count(root)));

            List<Object[]> results = entityManager.createQuery(cq).setMaxResults(5).getResultList();
            List<Map<String, Object>> topDocs = new ArrayList<>();
            for (Object[] row : results) {
                Map<String, Object> m = new HashMap<>();
                m.put("nom", row[0]);
                m.put("count", row[1]);
                topDocs.add(m);
            }
            response.put("topDocuments", topDocs);
        } catch(Exception e) {
            response.put("topDocuments", new ArrayList<>());
        }

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", totalDemandes);
        stats.put("en_attente", pending);
        stats.put("valide", validatedCount);
        stats.put("rejete", rejectedCount);
        stats.put("signature", signature);
        response.put("statuts", stats);

        String entityLabel = "Données";
        jakarta.persistence.criteria.Path<String> groupByPath = null;
        try {
            jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
            jakarta.persistence.criteria.CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            jakarta.persistence.criteria.Root<Demande> root = cq.from(Demande.class);

            if (currentUser.hasPermission("GERER_GLOBAL")) {
                entityLabel = "Commune";
                groupByPath = root.get("commune").get("nom");
            } else if (currentUser.getCommune() != null) {
                entityLabel = "Centre";
                groupByPath = root.get("centre").get("nom");
            } else if (currentUser.getCentre() != null) {
                entityLabel = "Agent";
                groupByPath = root.get("agent").get("nomComplet");
            }

            response.put("entityLabel", entityLabel);

            List<Map<String, Object>> perfList = new ArrayList<>();
            if (groupByPath != null) {
                cq.multiselect(groupByPath, cb.count(root));
                cq.where(spec.toPredicate(root, cq, cb));
                cq.groupBy(groupByPath);
                cq.orderBy(cb.desc(cb.count(root)));

                List<Object[]> perfResults = entityManager.createQuery(cq).setMaxResults(5).getResultList();
                for (Object[] row : perfResults) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("nom", row[0] != null ? row[0] : "Non assigné");
                    m.put("count", row[1]);
                    perfList.add(m);
                }
            }
            response.put("performance", perfList);

            List<Map<String, Object>> timelineList = new ArrayList<>();
            jakarta.persistence.criteria.CriteriaQuery<LocalDateTime> cqTime = cb.createQuery(LocalDateTime.class);
            jakarta.persistence.criteria.Root<Demande> rootTime = cqTime.from(Demande.class);
            cqTime.select(rootTime.get("dateSoumission"));
            cqTime.where(spec.toPredicate(rootTime, cqTime, cb));
            List<LocalDateTime> dates = entityManager.createQuery(cqTime).getResultList();

            Map<String, Long> countsByDate = new TreeMap<>();
            DateTimeFormatter dtfDate = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            for (LocalDateTime dt : dates) {
                if (dt != null) {
                    String dateStr = dt.format(dtfDate);
                    countsByDate.put(dateStr, countsByDate.getOrDefault(dateStr, 0L) + 1);
                }
            }
            for (Map.Entry<String, Long> entry : countsByDate.entrySet()) {
                Map<String, Object> m = new HashMap<>();
                m.put("date", entry.getKey());
                m.put("count", entry.getValue());
                timelineList.add(m);
            }
            response.put("timeline", timelineList);
        } catch(Exception e) {
            response.put("entityLabel", "Données");
            response.put("performance", new ArrayList<>());
            response.put("timeline", new ArrayList<>());
        }

        return response;
    }
}
