package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.CentreBureau;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CentreBureauRepository extends JpaRepository<CentreBureau, Integer> {

    List<CentreBureau> findByCentreId(Integer centreId);

    List<CentreBureau> findByCentreIdAndActifTrue(Integer centreId);

    Optional<CentreBureau> findByCentreIdAndBureauId(Integer centreId, Integer bureauId);

    boolean existsByCentreIdAndBureauId(Integer centreId, Integer bureauId);

    // Quels centres ont activé un bureau donné
    List<CentreBureau> findByBureauIdAndActifTrue(Integer bureauId);

    // Toutes les configurations de centres dans une région
    @Query("SELECT cb FROM CentreBureau cb WHERE cb.centre.commune.departement.region.id = :regionId")
    List<CentreBureau> findByRegionId(@Param("regionId") Integer regionId);

    // Toutes les configurations de centres dans un département
    @Query("SELECT cb FROM CentreBureau cb WHERE cb.centre.commune.departement.id = :departementId")
    List<CentreBureau> findByDepartementId(@Param("departementId") Integer departementId);

    void deleteByCentreIdAndBureauId(Integer centreId, Integer bureauId);
}
