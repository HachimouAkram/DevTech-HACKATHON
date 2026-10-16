package com.terangacivil.backend.service;

import com.terangacivil.backend.dto.AuditLogDto;
import com.terangacivil.backend.model.AuditLog;
import com.terangacivil.backend.model.Commune;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private com.terangacivil.backend.repository.UserRepository userRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLogNewTx(String action, String entityType, Integer entityId, User currentUser, ObjectNode oldValues, ObjectNode newValues) {
        try {
            User attachedUser = currentUser;
            if (currentUser != null && currentUser.getId() != null) {
                attachedUser = userRepository.findById(currentUser.getId()).orElse(null);
            }
            if (attachedUser == null) return;

            // Ne logger que les actions du Dashboard
            boolean hasDashboardAccess = attachedUser.getProfil() != null && 
                                         attachedUser.getProfil().getPermissions() != null &&
                                         attachedUser.getProfil().getPermissions().stream()
                                                     .anyMatch(p -> p.getNom().startsWith("GERER_"));
                                                     
            if (!hasDashboardAccess) return;

            AuditLog log = new AuditLog();
            log.setAction(action);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setUser(attachedUser);
            log.setCreatedAt(LocalDateTime.now());
            log.setOldValues(oldValues);
            log.setNewValues(newValues);
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Audit log save failed: " + e.getMessage());
        }
    }

    public long countLogs() {
        return auditLogRepository.count();
    }

    public Page<AuditLogDto> getFilteredAuditLogs(String search, String profil, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        User currentUser = currentUserService.getCurrentUser();
        String currentProfil = currentUser.getProfil().getNom();

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filtering based on permissions
            if (currentUser.hasPermission("GERER_GLOBAL")) {
                // Aucun filtre, voit tout
            } else if (currentUser.hasPermission("GERER_COMMUNE") && currentUser.getCommunesGerees() != null && !currentUser.getCommunesGerees().isEmpty()) {
                List<Integer> communeIds = currentUser.getCommunesGerees().stream().map(c -> c.getId()).collect(Collectors.toList());
                jakarta.persistence.criteria.Join<Object, Object> userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);
                jakarta.persistence.criteria.Join<Object, Object> centreJoin = userJoin.join("centre", jakarta.persistence.criteria.JoinType.LEFT);

                Predicate userCommunePred = userJoin.get("commune").get("id").in(communeIds);
                Predicate centreCommunePred = centreJoin.get("commune").get("id").in(communeIds);

                predicates.add(cb.or(userCommunePred, centreCommunePred));
            } else if (currentUser.hasPermission("GERER_CENTRE")) {
                Integer centreId = null;
                if (currentUser.getCentre() != null) {
                    centreId = currentUser.getCentre().getId();
                }

                if (centreId != null) {
                    jakarta.persistence.criteria.Join<Object, Object> userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);
                    jakarta.persistence.criteria.Join<Object, Object> centreJoin = userJoin.join("centre", jakarta.persistence.criteria.JoinType.LEFT);

                    Predicate userCentrePred = cb.equal(centreJoin.get("id"), centreId);
                    
                    predicates.add(userCentrePred);
                } else {
                    predicates.add(cb.equal(root.get("user").get("id"), currentUser.getId()));
                }
            } else {
                // Fallback: only see their own actions if no specific scope
                predicates.add(cb.equal(root.get("user").get("id"), currentUser.getId()));
            }

            // Optional filters from frontend
            if (search != null && !search.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("user").get("nomComplet")), "%" + search.toLowerCase() + "%"));
            }
            if (profil != null && !profil.isEmpty()) {
                predicates.add(cb.equal(root.get("user").get("profil").get("nom"), profil));
            }
            if (startDate != null && endDate != null) {
                predicates.add(cb.between(root.get("createdAt"), startDate, endDate));
            }

            if (predicates.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditLogRepository.findAll(spec, pageable).map(this::mapToDto);
    }

    private AuditLogDto mapToDto(AuditLog log) {
        AuditLogDto dto = new AuditLogDto();
        dto.setId(log.getId());
        dto.setAction(log.getAction());
        dto.setEntityType(log.getEntityType());
        dto.setEntityId(log.getEntityId());
        dto.setOldValues(log.getOldValues());
        dto.setNewValues(log.getNewValues());
        dto.setIpAddress(log.getIpAddress());
        dto.setCreatedAt(log.getCreatedAt());

        if (log.getUser() != null) {
            dto.setNomComplet(log.getUser().getNomComplet());
            if (log.getUser().getProfil() != null) {
                dto.setProfil(log.getUser().getProfil().getNom());
            }
            if (log.getUser().getCentre() != null) {
                dto.setCentreNom(log.getUser().getCentre().getNom());
            }
            if (log.getUser().getCommune() != null) {
                dto.setCommuneNom(log.getUser().getCommune().getNom());
            }
        }
        return dto;
    }
}
