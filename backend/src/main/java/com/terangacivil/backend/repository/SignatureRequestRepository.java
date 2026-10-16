package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.SignatureRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SignatureRequestRepository extends JpaRepository<SignatureRequest, Integer> {
    List<SignatureRequest> findByDemandeId(Integer demandeId);
    List<SignatureRequest> findByDemandeIdAndStepId(Integer demandeId, Integer stepId);
    List<SignatureRequest> findBySignataireCibleIdAndStatut(Integer signataireCibleId, String statut);
}
