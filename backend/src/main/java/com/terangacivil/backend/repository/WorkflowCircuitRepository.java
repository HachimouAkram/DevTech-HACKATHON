package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.WorkflowCircuit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowCircuitRepository extends JpaRepository<WorkflowCircuit, Integer> {
    List<WorkflowCircuit> findByActiviteId(Integer activiteId);
    Optional<WorkflowCircuit> findByActiviteIdAndActifTrue(Integer activiteId);
}
