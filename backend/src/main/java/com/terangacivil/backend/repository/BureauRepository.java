package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Bureau;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BureauRepository extends JpaRepository<Bureau, Integer> {
    List<Bureau> findByActifTrueOrderByOrdreAsc();
}
