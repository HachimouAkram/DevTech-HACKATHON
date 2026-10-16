package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.WorkflowStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowStepRepository extends JpaRepository<WorkflowStep, Integer> {
    List<WorkflowStep> findByCircuitIdOrderByOrdreAsc(Integer circuitId);
    Optional<WorkflowStep> findFirstByCircuitIdOrderByOrdreAsc(Integer circuitId);
}
