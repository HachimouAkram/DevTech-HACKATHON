package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository du catalogue global des services.
 * Les services ne sont plus liés à une commune directement.
 * La liaison commune <-> service se fait via CommuneServiceRepository.
 */
import org.springframework.data.jpa.repository.EntityGraph;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Integer> {
    @EntityGraph(attributePaths = {"bureau"})
    List<Service> findAll();

    @EntityGraph(attributePaths = {"bureau"})
    List<Service> findByActifTrue();

    @EntityGraph(attributePaths = {"bureau"})
    List<Service> findByBureauId(Integer bureauId);

    @EntityGraph(attributePaths = {"bureau"})
    List<Service> findByBureauIdAndActifTrue(Integer bureauId);
    boolean existsByNomAndBureauId(String nom, Integer bureauId);
    long countByBureauIdAndActifTrue(Integer bureauId);
}
