package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.PointageConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PointageConfigRepository extends JpaRepository<PointageConfig, Integer> {
    Optional<PointageConfig> findByCentreId(Integer centreId);
    Optional<PointageConfig> findByBureauId(Integer bureauId);
}
