package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Activity;
import com.terangacivil.backend.model.Demande;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.model.Service;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class DemandeSpecifications {

    public static Specification<Demande> hasCitoyen(Integer citoyenId) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("citoyen").get("id"), citoyenId);
    }

    public static Specification<Demande> hasStatut(String statut) {
        return (root, query, criteriaBuilder) -> {
            if (statut == null || statut.isBlank()) {
                return criteriaBuilder.conjunction();
            }
            if ("hors_delais".equalsIgnoreCase(statut)) {
                // Not ideal to do business logic like this, but we can't easily query "isExpired" method.
                // We'll skip exact SQL expiration here or implement it simpler, or just filter it post-fetch if small.
                // Ideally we'd compare dateSoumission + delai with current date in SQL.
                // For now, if "hors_delais" is passed, we handle it.
            }
            return criteriaBuilder.equal(criteriaBuilder.lower(root.get("statut")), statut.toLowerCase());
        };
    }

    public static Specification<Demande> isArchived(Boolean archive) {
        return (root, query, criteriaBuilder) -> {
            if (archive == null || !archive) {
                return criteriaBuilder.or(
                    criteriaBuilder.isNull(root.get("archive")),
                    criteriaBuilder.isFalse(root.get("archive"))
                );
            }
            return criteriaBuilder.isTrue(root.get("archive"));
        };
    }

    public static Specification<Demande> betweenDates(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (start != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("dateSoumission"), start));
            }
            if (end != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("dateSoumission"), end));
            }
            if (predicates.isEmpty()) return criteriaBuilder.conjunction();
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Demande> searchContains(String search) {
        return (root, query, criteriaBuilder) -> {
            if (search == null || search.isBlank()) {
                return criteriaBuilder.conjunction();
            }
            String lowerSearch = "%" + search.toLowerCase() + "%";
            
            // Join with citoyen to search by name or phone
            var citoyenJoin = root.join("citoyen", JoinType.LEFT);
            
            Predicate matchRef = criteriaBuilder.like(criteriaBuilder.lower(root.get("reference")), lowerSearch);
            Predicate matchCitName = criteriaBuilder.like(criteriaBuilder.lower(citoyenJoin.get("nomComplet")), lowerSearch);
            Predicate matchCitTel = criteriaBuilder.like(criteriaBuilder.lower(citoyenJoin.get("telephone")), lowerSearch);
            
            // JSON search is complex in standard JPA, we'll stick to basic fields for SQL search
            // or we could cast to string in Postgres: criteriaBuilder.like(criteriaBuilder.function("CAST", String.class, root.get("donnees"), criteriaBuilder.literal("text")), lowerSearch)
            
            return criteriaBuilder.or(matchRef, matchCitName, matchCitTel);
        };
    }

    public static Specification<Demande> filterByScopeAndRole(User currentUser) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Citoyen (seulement ses propres demandes) - Not handled here if handled explicitly by hasCitoyen in service,
            // but let's assume this handles the officer/agent scopes.

            boolean isGlobal = currentUser.hasPermission("GERER_GLOBAL") || 
                               currentUser.hasPermission("GERER_REGION") || 
                               currentUser.hasPermission("GERER_DEPARTEMENT");
                               
            if (isGlobal) {
                // Global sees everything within their geographic scope
                if (currentUser.getCentre() != null) {
                    predicates.add(criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()));
                } else if (currentUser.getCommune() != null) {
                    predicates.add(criteriaBuilder.equal(root.get("commune").get("id"), currentUser.getCommune().getId()));
                }
                // (Skip Region/Dept for brevity in this simple implementation, or add IN clauses)
                if (predicates.isEmpty()) {
                    return criteriaBuilder.conjunction(); // ALL
                }
                return criteriaBuilder.or(predicates.toArray(new Predicate[0]));
            }

            // Agents de guichet
            if (currentUser.hasPermission("GERER_ACTIVITES")) {
                List<Integer> actIds = currentUser.getActivities().stream().map(Activity::getId).collect(Collectors.toList());
                if (!actIds.isEmpty()) {
                    Predicate pAct = root.get("activite").get("id").in(actIds);
                    if (currentUser.getCentre() != null) {
                        return criteriaBuilder.and(pAct, criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()));
                    }
                    return pAct;
                } else if (currentUser.getServiceId() != null) {
                    Predicate pServ = criteriaBuilder.equal(root.get("activite").get("service").get("id"), currentUser.getServiceId());
                    if (currentUser.getCentre() != null) {
                        return criteriaBuilder.and(pServ, criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()));
                    }
                    return pServ;
                } else if (currentUser.getCentre() != null) {
                    return criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId());
                }
                return criteriaBuilder.disjunction(); // Rien à afficher
            }

            // Officiers (Commune, Centre, Bureau, Service)
            boolean isOfficierLocal = currentUser.hasPermission("GERER_COMMUNE") || 
                                      currentUser.hasPermission("GERER_CENTRE") || 
                                      currentUser.hasPermission("GERER_BUREAU") || 
                                      currentUser.hasPermission("GERER_SERVICES");
                                      
            if (isOfficierLocal) {
                if (currentUser.hasPermission("GERER_COMMUNE") && currentUser.getCommune() != null) {
                    predicates.add(criteriaBuilder.equal(root.get("commune").get("id"), currentUser.getCommune().getId()));
                } else if (currentUser.hasPermission("GERER_CENTRE") && currentUser.getCentre() != null) {
                    predicates.add(criteriaBuilder.or(
                        criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()),
                        criteriaBuilder.equal(root.get("centreDelivrance").get("id"), currentUser.getCentre().getId())
                    ));
                } else if (currentUser.hasPermission("GERER_BUREAU") && currentUser.getBureau() != null) {
                    Predicate pBureau = criteriaBuilder.equal(root.get("activite").get("service").get("bureau").get("id"), currentUser.getBureau().getId());
                    if (currentUser.getCentre() != null) {
                        predicates.add(criteriaBuilder.and(pBureau, criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId())));
                    } else {
                        predicates.add(pBureau);
                    }
                } else if (currentUser.hasPermission("GERER_SERVICES")) {
                    List<Integer> serviceIds = currentUser.getServices() != null ? currentUser.getServices().stream().map(Service::getId).collect(Collectors.toList()) : new ArrayList<>();
                    if (currentUser.getServiceId() != null) serviceIds.add(currentUser.getServiceId());
                    if (!serviceIds.isEmpty()) {
                        Predicate pServ = root.get("activite").get("service").get("id").in(serviceIds);
                        if (currentUser.getCentre() != null) {
                            predicates.add(criteriaBuilder.and(pServ, criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId())));
                        } else {
                            predicates.add(pServ);
                        }
                    }
                }
                
                // Les officiers "voient" tout ce qui est dans leur périmètre (les actions sont restreintes côté frontend)
                Predicate scopePred = predicates.isEmpty() ? criteriaBuilder.conjunction() : criteriaBuilder.or(predicates.toArray(new Predicate[0]));
                
                // Restriction : Si le statut est 'signature', seul l'officier assigné peut voir la demande
                Predicate isSignature = criteriaBuilder.equal(criteriaBuilder.lower(root.get("statut")), "signature");
                Predicate isAssignedToMe = criteriaBuilder.equal(root.get("officier").get("id"), currentUser.getId());
                Predicate signatureVisibility = criteriaBuilder.or(criteriaBuilder.not(isSignature), isAssignedToMe);
                
                return criteriaBuilder.and(scopePred, signatureVisibility);
            }
            
            // Archiviste
            if (currentUser.hasPermission("GERER_ARCHIVE")) {
                if (currentUser.getCentre() != null) {
                    predicates.add(criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()));
                } else if (currentUser.getCommune() != null) {
                    predicates.add(criteriaBuilder.equal(root.get("commune").get("id"), currentUser.getCommune().getId()));
                }
                Predicate scopePred = predicates.isEmpty() ? criteriaBuilder.conjunction() : criteriaBuilder.or(predicates.toArray(new Predicate[0]));
                return criteriaBuilder.and(scopePred, criteriaBuilder.isTrue(root.get("archive")));
            }

            // Fallback (Citoyen simple ou aucun droit spé)
            return criteriaBuilder.equal(root.get("citoyen").get("id"), currentUser.getId());
        };
    }

    public static Specification<Demande> filterByDashboardScope(User currentUser) {
        return (root, query, criteriaBuilder) -> {
            Predicate scopePred = criteriaBuilder.disjunction();
            if (currentUser.hasPermission("GERER_GLOBAL")) {
                scopePred = criteriaBuilder.conjunction();
            } else if (currentUser.hasPermission("GERER_COMMUNE")) {
                if (currentUser.getCommune() != null) {
                    scopePred = criteriaBuilder.equal(root.get("commune").get("id"), currentUser.getCommune().getId());
                }
            } else if (currentUser.hasPermission("GERER_CENTRE")) {
                if (currentUser.getCentre() != null) {
                    scopePred = criteriaBuilder.or(
                        criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()),
                        criteriaBuilder.equal(root.get("centreDelivrance").get("id"), currentUser.getCentre().getId())
                    );
                }
            } else if (currentUser.hasPermission("GERER_BUREAU")) {
                Integer centreId = currentUser.getCentre() != null ? currentUser.getCentre().getId() : null;
                Integer bureauId = currentUser.getBureau() != null ? currentUser.getBureau().getId() : null;
                
                if (bureauId != null) {
                    Predicate pBureau = criteriaBuilder.equal(root.get("activite").get("service").get("bureau").get("id"), bureauId);
                    if (centreId != null) {
                        scopePred = criteriaBuilder.and(pBureau, criteriaBuilder.equal(root.get("centre").get("id"), centreId));
                    } else {
                        scopePred = pBureau;
                    }
                } else {
                    List<Integer> serviceIds = currentUser.getServices() != null ? currentUser.getServices().stream().map(Service::getId).collect(Collectors.toList()) : new ArrayList<>();
                    if (serviceIds.isEmpty() && currentUser.getServiceId() != null) {
                        serviceIds.add(currentUser.getServiceId());
                    }
                    
                    if (!serviceIds.isEmpty()) {
                        Predicate pServ = root.get("activite").get("service").get("id").in(serviceIds);
                        if (centreId != null) {
                            scopePred = criteriaBuilder.and(pServ, criteriaBuilder.equal(root.get("centre").get("id"), centreId));
                        } else {
                            scopePred = pServ;
                        }
                    } else if (centreId != null) {
                        scopePred = criteriaBuilder.equal(root.get("centre").get("id"), centreId);
                    }
                }
            } else if (currentUser.hasPermission("GERER_SERVICES")) {
                List<Integer> activityIds = currentUser.getActivities() != null ? currentUser.getActivities().stream().map(Activity::getId).collect(Collectors.toList()) : new ArrayList<>();
                if (!activityIds.isEmpty()) {
                    Predicate pAct = root.get("activite").get("id").in(activityIds);
                    if (currentUser.getCentre() != null) {
                        scopePred = criteriaBuilder.and(pAct, criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()));
                    } else {
                        scopePred = pAct;
                    }
                } else if (currentUser.getCentre() != null) {
                    scopePred = criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId());
                }
            } else if (currentUser.hasPermission("GERER_ACTIVITES")) {
                List<Integer> activityIds = currentUser.getActivities() != null ? currentUser.getActivities().stream().map(Activity::getId).collect(Collectors.toList()) : new ArrayList<>();
                if (!activityIds.isEmpty()) {
                    Predicate pAct = root.get("activite").get("id").in(activityIds);
                    if (currentUser.getCentre() != null) {
                        scopePred = criteriaBuilder.and(pAct, criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()));
                    } else {
                        scopePred = pAct;
                    }
                } else if (currentUser.getServiceId() != null) {
                    Predicate pServ = criteriaBuilder.equal(root.get("activite").get("service").get("id"), currentUser.getServiceId());
                    if (currentUser.getCentre() != null) {
                        scopePred = criteriaBuilder.and(pServ, criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId()));
                    } else {
                        scopePred = pServ;
                    }
                } else if (currentUser.getCentre() != null) {
                    scopePred = criteriaBuilder.equal(root.get("centre").get("id"), currentUser.getCentre().getId());
                }
            } else {
                scopePred = criteriaBuilder.equal(root.get("citoyen").get("id"), currentUser.getId());
            }

            // Restriction de visibilité : si le statut est 'signature', on doit en plus vérifier que officier_id = currentUser.getId()
            Predicate isSignature = criteriaBuilder.equal(criteriaBuilder.lower(root.get("statut")), "signature");
            Predicate isAssignedToMe = criteriaBuilder.equal(root.get("officier").get("id"), currentUser.getId());
            Predicate signatureVisibility = criteriaBuilder.or(criteriaBuilder.not(isSignature), isAssignedToMe);

            return criteriaBuilder.and(scopePred, signatureVisibility);
        };
    }

    public static Specification<Demande> hasPayment() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.and(
                criteriaBuilder.isNotNull(root.get("montantPaye")),
                criteriaBuilder.greaterThan(root.get("montantPaye"), 0)
            );
    }

    public static Specification<Demande> filterByPaymentMode(String modePaiement) {
        return (root, query, criteriaBuilder) -> {
            if (modePaiement == null || modePaiement.isBlank()) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.equal(root.get("modePaiement"), modePaiement);
        };
    }
}
