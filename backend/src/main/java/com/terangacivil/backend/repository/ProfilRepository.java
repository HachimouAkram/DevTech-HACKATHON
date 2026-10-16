package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Profil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProfilRepository extends JpaRepository<Profil, Integer> {
    Optional<Profil> findByNom(String nom);
}
