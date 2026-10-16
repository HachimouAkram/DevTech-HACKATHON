package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Departement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartementRepository extends JpaRepository<Departement, Integer> {
    Optional<Departement> findByCode(String code);

    @EntityGraph(attributePaths = {"region"})
    List<Departement> findAll();

    List<Departement> findByRegionId(Integer regionId);
}
