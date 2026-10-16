package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository du catalogue global des activités.
 * Les activités ne sont plus liées à une commune directement.
 * La liaison commune <-> activité se fait via CommuneActiviteRepository.
 */
import org.springframework.data.jpa.repository.EntityGraph;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Integer> {
    @EntityGraph(attributePaths = {"service", "service.bureau"})
    List<Activity> findAll();

    @EntityGraph(attributePaths = {"service", "service.bureau"})
    List<Activity> findByActifTrue();

    @EntityGraph(attributePaths = {"service", "service.bureau"})
    List<Activity> findByServiceId(Integer serviceId);

    @EntityGraph(attributePaths = {"service", "service.bureau"})
    List<Activity> findByServiceIdAndActifTrue(Integer serviceId);

    @EntityGraph(attributePaths = {"service", "service.bureau"})
    List<Activity> findByServiceBureauId(Integer bureauId);

    @EntityGraph(attributePaths = {"service", "service.bureau"})
    List<Activity> findByServiceBureauIdAndActifTrue(Integer bureauId);
}
