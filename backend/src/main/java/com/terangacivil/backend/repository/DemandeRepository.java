package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Demande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@Repository
public interface DemandeRepository extends JpaRepository<Demande, Integer>, JpaSpecificationExecutor<Demande> {
    
    @Override
    @EntityGraph(attributePaths = {
        "citoyen", "activite", "activite.service", "centre", "commune", 
        "agent", "officier", "currentStep", "centreDelivrance", "centreDelivrance.commune"
    })
    Page<Demande> findAll(Specification<Demande> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {
        "citoyen", "activite", "activite.service", "centre", "commune", 
        "agent", "officier", "currentStep", "centreDelivrance", "centreDelivrance.commune"
    })
    List<Demande> findAll(Specification<Demande> spec);

    Optional<Demande> findByReference(String reference);

    @Query("SELECT d FROM Demande d WHERE d.citoyen.id = :citoyenId")
    List<Demande> findByCitoyenId(@Param("citoyenId") Integer citoyenId);

    // Filtrer par commune directement sur la demande (commune_id stocké dans demandes)
    // L'ancien chemin d.activite.service.commune.id ne fonctionne plus : Service est maintenant global.
    @Query("SELECT d FROM Demande d WHERE d.commune.id = :communeId")
    List<Demande> findByCommuneId(@Param("communeId") Integer communeId);

    @Query("SELECT d FROM Demande d WHERE d.centre.id = :centreId")
    List<Demande> findByCentreId(@Param("centreId") Integer centreId);

    @Query("SELECT d FROM Demande d WHERE d.centre.id = :centreId OR d.centreDelivrance.id = :centreId")
    List<Demande> findByCentreIdOrCentreDelivranceId(@Param("centreId") Integer centreId);

    @Query("SELECT d FROM Demande d WHERE d.centreDelivrance.id = :centreId AND d.statutTransfert IN ('en_attente_envoi', 'pret_a_expedier', 'en_transit', 'recu')")
    List<Demande> findIncomingTransfersByCentreId(@Param("centreId") Integer centreId);

    // Queries for Officer: see demands matching their assigned services
    @Query("SELECT d FROM Demande d WHERE " +
           "d.activite.service.id IN :serviceIds " +
           "AND (:centreId IS NULL OR d.centre.id = :centreId)")
    List<Demande> findByServicesAndCentre(@Param("serviceIds") List<Integer> serviceIds, @Param("centreId") Integer centreId);

    // Queries for Agent: see demands matching their assigned activities
    @Query("SELECT d FROM Demande d WHERE " +
           "d.activite.id IN :activityIds " +
           "AND (:centreId IS NULL OR d.centre.id = :centreId)")
    List<Demande> findByActivitiesAndCentre(@Param("activityIds") List<Integer> activityIds, @Param("centreId") Integer centreId);

    // KPI queries
    @Query("SELECT COUNT(d) FROM Demande d")
    long countAll();

    @Query("SELECT COUNT(d) FROM Demande d WHERE d.statut = :statut")
    long countByStatut(@Param("statut") String statut);

    // Utilise d.commune.id au lieu de l'ancien d.activite.service.commune.id (cassé)
    @Query("SELECT COUNT(d) FROM Demande d WHERE d.commune.id = :communeId")
    long countByCommuneId(@Param("communeId") Integer communeId);

    @Query("SELECT COUNT(d) FROM Demande d WHERE d.commune.id = :communeId AND d.statut = :statut")
    long countByCommuneIdAndStatut(@Param("communeId") Integer communeId, @Param("statut") String statut);

    @Query("SELECT COUNT(d) FROM Demande d WHERE d.activite.service.id IN :serviceIds AND d.statut = :statut")
    long countByServicesAndStatut(@Param("serviceIds") List<Integer> serviceIds, @Param("statut") String statut);

    @Query("SELECT COUNT(d) FROM Demande d WHERE d.activite.id IN :activityIds AND d.statut = :statut")
    long countByActivitiesAndStatut(@Param("activityIds") List<Integer> activityIds, @Param("statut") String statut);

    // -----------------------------------------------------------------------
    // Optimized queries for DemandeReminderService (avoids N+1 + full table scan)
    // -----------------------------------------------------------------------

    /**
     * Fetch only active demands (not valide/pret/disponible/rejete) that have
     * an activite and a dateSoumission, eagerly joining activite and agent/centre
     * so the scheduler doesn't trigger lazy-load queries inside the loop.
     */
    @Query("SELECT MAX(d.numero) FROM Demande d WHERE d.annee = :annee AND d.activite.id = :activiteId")
    Integer findMaxNumeroByAnneeAndActivite(@Param("annee") Integer annee, @Param("activiteId") Integer activiteId);

    @Query("SELECT d FROM Demande d "
            + "JOIN FETCH d.activite a "
            + "LEFT JOIN FETCH d.agent ag "
            + "LEFT JOIN FETCH ag.profil p "
            + "LEFT JOIN FETCH p.permissions "
            + "LEFT JOIN FETCH d.centre "
            + "WHERE d.statut IS NOT NULL "
            + "AND LOWER(d.statut) NOT IN ('valide','pret','disponible','rejete') "
            + "AND d.dateSoumission IS NOT NULL")
    List<Demande> findActiveDemandesForReminder();
}
