package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.ChampDynamique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChampDynamiqueRepository extends JpaRepository<ChampDynamique, Integer> {
    List<ChampDynamique> findByActiviteIdAndActifTrueOrderByOrdreAsc(Integer activiteId);
    void deleteByActiviteId(Integer activiteId);
}
