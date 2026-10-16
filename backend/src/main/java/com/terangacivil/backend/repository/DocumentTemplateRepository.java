package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.DocumentTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import java.util.List;

@Repository
public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, Integer> {
    List<DocumentTemplate> findByActiviteId(Integer activiteId);
    List<DocumentTemplate> findByActiviteIdAndActifTrue(Integer activiteId);

    @Query("SELECT DISTINCT t.activite.id FROM DocumentTemplate t WHERE t.actif = true")
    List<Integer> findActivityIdsWithActiveTemplates();
}
