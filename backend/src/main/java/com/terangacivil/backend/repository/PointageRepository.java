package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Pointage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PointageRepository extends JpaRepository<Pointage, Integer> {
    Optional<Pointage> findByUserIdAndDate(Integer userId, LocalDate date);
    List<Pointage> findByDate(LocalDate date);
    List<Pointage> findByCentreIdAndDate(Integer centreId, LocalDate date);
    List<Pointage> findByBureauIdAndDate(Integer bureauId, LocalDate date);
    List<Pointage> findByUserId(Integer userId);
}
