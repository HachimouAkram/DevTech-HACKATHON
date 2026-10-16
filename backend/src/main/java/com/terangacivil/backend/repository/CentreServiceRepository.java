package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.CentreService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CentreServiceRepository extends JpaRepository<CentreService, Integer> {

    List<CentreService> findByCentreId(Integer centreId);

    List<CentreService> findByCentreIdAndActifTrue(Integer centreId);

    Optional<CentreService> findByCentreIdAndServiceId(Integer centreId, Integer serviceId);

    boolean existsByCentreIdAndServiceId(Integer centreId, Integer serviceId);

    // Quels centres ont activé un service donné (pour la recherche citoyen)
    List<CentreService> findByServiceIdAndActifTrue(Integer serviceId);

    // Services d'un bureau activés dans un centre
    @Query("SELECT cs FROM CentreService cs WHERE cs.centre.id = :centreId AND cs.service.bureau.id = :bureauId")
    List<CentreService> findByCentreIdAndBureauId(
            @Param("centreId") Integer centreId,
            @Param("bureauId") Integer bureauId);

    // Toutes les configurations dans une région
    @Query("SELECT cs FROM CentreService cs WHERE cs.centre.commune.departement.region.id = :regionId")
    List<CentreService> findByRegionId(@Param("regionId") Integer regionId);

    // Toutes les configurations dans un département
    @Query("SELECT cs FROM CentreService cs WHERE cs.centre.commune.departement.id = :departementId")
    List<CentreService> findByDepartementId(@Param("departementId") Integer departementId);

    void deleteByCentreIdAndServiceId(Integer centreId, Integer serviceId);
}
