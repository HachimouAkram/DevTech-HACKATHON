package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.DemandeHistorique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DemandeHistoriqueRepository extends JpaRepository<DemandeHistorique, Integer> {
    List<DemandeHistorique> findByDemandeIdOrderByDateActionDesc(Integer demandeId);
}
