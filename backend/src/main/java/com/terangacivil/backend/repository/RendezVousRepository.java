package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.RendezVous;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface RendezVousRepository extends JpaRepository<RendezVous, Integer> {
    List<RendezVous> findByCentreIdAndDate(Integer centreId, LocalDate date);
    
    List<RendezVous> findByCitoyenId(Integer citoyenId);
    
    List<RendezVous> findByCentreId(Integer centreId);

    List<RendezVous> findByDemandeId(Integer demandeId);

    List<RendezVous> findByDemandeAgentId(Integer agentId);

    boolean existsByCentreIdAndDateAndHeureAndStatutNot(Integer centreId, LocalDate date, LocalTime heure, String statut);
}
