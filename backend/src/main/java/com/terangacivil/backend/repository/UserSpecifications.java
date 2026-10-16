package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.User;
import com.terangacivil.backend.model.Region;
import com.terangacivil.backend.model.Departement;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class UserSpecifications {

    public static Specification<User> filterUsers(User currentUser, String search, String role, String permission) {
        return (Root<User> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            
            // To prevent N+1 on list, we can fetch relations if it's not a count query
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("profil", JoinType.LEFT).fetch("permissions", JoinType.LEFT);
                root.fetch("commune", JoinType.LEFT);
                root.fetch("centre", JoinType.LEFT);
                root.fetch("bureau", JoinType.LEFT);
            }

            List<Predicate> predicates = new ArrayList<>();

            // 1. Scope checks
            Predicate scopePredicate = null;
            
            // Toujours permettre de voir les utilisateurs de la même commune
            Predicate sameCommune = null;
            if (currentUser.getCommune() != null) {
                sameCommune = cb.equal(root.get("commune").get("id"), currentUser.getCommune().getId());
            }

            if (currentUser.hasPermission("GERER_GLOBAL")) {
                scopePredicate = cb.conjunction(); // ALL
            } else if (currentUser.hasPermission("GERER_REGION")) {
                if (currentUser.getRegionsGerees() != null && !currentUser.getRegionsGerees().isEmpty()) {
                    List<Integer> regionIds = currentUser.getRegionsGerees().stream().map(Region::getId).toList();
                    Join<Object, Object> communeJoin = root.join("commune", JoinType.LEFT);
                    Join<Object, Object> deptJoin = communeJoin.join("departement", JoinType.LEFT);
                    Predicate inRegion = deptJoin.get("region").get("id").in(regionIds);
                    
                    Join<Object, Object> managedDepts = root.join("departementsGeres", JoinType.LEFT);
                    Predicate manageDeptInRegion = managedDepts.get("region").get("id").in(regionIds);
                    
                    scopePredicate = cb.or(inRegion, manageDeptInRegion);
                } else {
                    scopePredicate = cb.disjunction(); // NONE
                }
            } else if (currentUser.hasPermission("GERER_DEPARTEMENT")) {
                if (currentUser.getDepartementsGeres() != null && !currentUser.getDepartementsGeres().isEmpty()) {
                    List<Integer> deptIds = currentUser.getDepartementsGeres().stream().map(Departement::getId).toList();
                    Join<Object, Object> communeJoin = root.join("commune", JoinType.LEFT);
                    scopePredicate = communeJoin.get("departement").get("id").in(deptIds);
                } else {
                    scopePredicate = cb.disjunction();
                }
            } else if (currentUser.hasPermission("GERER_COMMUNE")) {
                if (currentUser.getCommune() != null) {
                    scopePredicate = cb.equal(root.get("commune").get("id"), currentUser.getCommune().getId());
                } else {
                    scopePredicate = cb.disjunction();
                }
            } else if (currentUser.hasPermission("GERER_CENTRE") || currentUser.hasPermission("GERER_BUREAU")) {
                if (currentUser.getCentre() != null) {
                    scopePredicate = cb.equal(root.get("centre").get("id"), currentUser.getCentre().getId());
                } else {
                    scopePredicate = cb.disjunction();
                }
            } else if (currentUser.hasPermission("GERER_SERVICES")) {
                if (currentUser.getBureau() != null) {
                    Predicate sameBureau = cb.equal(root.get("bureau").get("id"), currentUser.getBureau().getId());
                    
                    // User must have at least one activity sharing a service with current user
                    if (currentUser.getServices() != null && !currentUser.getServices().isEmpty()) {
                        List<Integer> serviceIds = currentUser.getServices().stream().map(s -> s.getId()).toList();
                        Join<Object, Object> activitiesJoin = root.join("activities", JoinType.INNER);
                        Predicate shareService = activitiesJoin.get("service").get("id").in(serviceIds);
                        scopePredicate = cb.and(sameBureau, shareService);
                    } else {
                        scopePredicate = cb.disjunction();
                    }
                } else {
                    scopePredicate = cb.disjunction();
                }
            } else {
                scopePredicate = cb.disjunction(); // Default deny
            }

            if (scopePredicate != null) {
                if (sameCommune != null) {
                    predicates.add(cb.or(sameCommune, scopePredicate));
                } else {
                    predicates.add(scopePredicate);
                }
            }

            // 2. Role filter (Legacy)
            if (role != null && !role.isBlank()) {
                Join<Object, Object> profilJoin = root.join("profil", JoinType.LEFT);
                Join<Object, Object> permsJoin = profilJoin.join("permissions", JoinType.LEFT);
                predicates.add(cb.equal(permsJoin.get("nom"), role));
            }

            // 2.5. Permission filter
            if (permission != null && !permission.isBlank()) {
                Join<Object, Object> profilJoin = root.join("profil", JoinType.LEFT);
                Join<Object, Object> permsJoin = profilJoin.join("permissions", JoinType.LEFT);
                predicates.add(cb.equal(permsJoin.get("nom"), permission));
            }

            // 3. Keyword Search filter
            if (search != null && !search.isBlank()) {
                String s = "%" + search.toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("nomComplet")), s);
                Predicate telMatch = cb.like(cb.lower(root.get("telephone")), s);
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), s);
                predicates.add(cb.or(nameMatch, telMatch, emailMatch));
            }

            // Ensure distinct results since we use joins
            query.distinct(true);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
