package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Centre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CentreRepository extends JpaRepository<Centre, Integer> {
    Optional<Centre> findByCode(String code);

    @EntityGraph(attributePaths = {"commune", "commune.departement", "commune.departement.region"})
    List<Centre> findAll();

    List<Centre> findByCommuneId(Integer communeId);
}
