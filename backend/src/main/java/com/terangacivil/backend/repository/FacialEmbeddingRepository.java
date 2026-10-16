package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.FacialEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacialEmbeddingRepository extends JpaRepository<FacialEmbedding, Integer> {
    Optional<FacialEmbedding> findByUserId(Integer userId);
    List<FacialEmbedding> findByUserCentreId(Integer centreId);
    List<FacialEmbedding> findByUserBureauId(Integer bureauId);
}
