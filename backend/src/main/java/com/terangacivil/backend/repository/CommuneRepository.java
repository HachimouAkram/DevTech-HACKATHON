package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Commune;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommuneRepository extends JpaRepository<Commune, Integer> {
    Optional<Commune> findByCode(String code);

    @EntityGraph(attributePaths = {"departement", "departement.region"})
    List<Commune> findAll();

    List<Commune> findByDepartementId(Integer departementId);
}
