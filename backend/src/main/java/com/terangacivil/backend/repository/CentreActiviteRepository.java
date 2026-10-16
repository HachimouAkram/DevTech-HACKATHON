package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.CentreActivite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CentreActiviteRepository extends JpaRepository<CentreActivite, Integer> {

    List<CentreActivite> findByCentreId(Integer centreId);

    List<CentreActivite> findByCentreIdAndActifTrue(Integer centreId);

    Optional<CentreActivite> findByCentreIdAndActiviteId(Integer centreId, Integer activiteId);

    boolean existsByCentreIdAndActiviteId(Integer centreId, Integer activiteId);

    // Activités d'un service données dans un centre
    @Query("SELECT ca FROM CentreActivite ca WHERE ca.centre.id = :centreId AND ca.activite.service.id = :serviceId")
    List<CentreActivite> findByCentreIdAndServiceId(
            @Param("centreId") Integer centreId,
            @Param("serviceId") Integer serviceId);

    // Activités actives d'un service dans un centre
    @Query("SELECT ca FROM CentreActivite ca WHERE ca.centre.id = :centreId AND ca.activite.service.id = :serviceId AND ca.actif = true")
    List<CentreActivite> findActiveByCentreIdAndServiceId(
            @Param("centreId") Integer centreId,
            @Param("serviceId") Integer serviceId);

    // Quels centres proposent une activité donnée (pour la recherche citoyen)
    List<CentreActivite> findByActiviteIdAndActifTrue(Integer activiteId);

    void deleteByCentreIdAndActiviteId(Integer centreId, Integer activiteId);

    // Supprimer toutes les activités d'un service pour un centre
    // (utilisé quand on désactive un service entier)
    @Modifying
    @Transactional
    @Query("DELETE FROM CentreActivite ca WHERE ca.centre.id = :centreId AND ca.activite.service.id = :serviceId")
    void deleteByCentreIdAndServiceId(
            @Param("centreId") Integer centreId,
            @Param("serviceId") Integer serviceId);
}
