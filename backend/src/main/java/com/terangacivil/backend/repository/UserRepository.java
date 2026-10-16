package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface UserRepository extends JpaRepository<User, Integer>, JpaSpecificationExecutor<User> {
    @EntityGraph(attributePaths = {"profil", "profil.permissions", "commune", "centre", "bureau"})
    Optional<User> findByTelephone(String telephone);

    @EntityGraph(attributePaths = {"profil", "profil.permissions", "commune", "centre", "bureau"})
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.profil.nom = :role) AND " +
           "(:search IS NULL OR LOWER(u.nomComplet) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.telephone) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<User> searchUsers(@Param("search") String search, @Param("role") String role);

    @Query("SELECT DISTINCT u FROM User u "
        + "LEFT JOIN FETCH u.activities "
        + "LEFT JOIN FETCH u.centre "
        + "LEFT JOIN FETCH u.commune "
        + "LEFT JOIN FETCH u.profil p "
        + "LEFT JOIN FETCH p.permissions "
        + "WHERE u.id = :id")
    Optional<User> findByIdWithActivities(@Param("id") Integer id);

    long countByActifTrue();
    @Query("SELECT COUNT(u) FROM User u JOIN u.profil p JOIN p.permissions perm WHERE u.commune.id = :communeId AND perm.nom = :permissionNom")
    long countByCommuneIdAndPermission(@Param("communeId") Integer communeId, @Param("permissionNom") String permissionNom);

    @Query("SELECT COUNT(u) FROM User u JOIN u.profil p JOIN p.permissions perm WHERE u.centre.id = :centreId AND perm.nom = :permissionNom")
    long countByCentreIdAndPermission(@Param("centreId") Integer centreId, @Param("permissionNom") String permissionNom);

    @EntityGraph(attributePaths = {"profil", "profil.permissions", "commune", "centre", "bureau"})
    @Query("SELECT u FROM User u JOIN u.profil p JOIN p.permissions perm WHERE u.centre.id = :centreId AND perm.nom = :permission")
    List<User> findByCentreIdAndPermission(@Param("centreId") Integer centreId, @Param("permission") String permission);

    @EntityGraph(attributePaths = {"profil", "profil.permissions", "commune", "centre", "bureau"})
    @Query("SELECT u FROM User u JOIN u.profil p JOIN p.permissions perm WHERE u.bureau.id = :bureauId AND perm.nom = :permission")
    List<User> findByBureauIdAndPermission(@Param("bureauId") Integer bureauId, @Param("permission") String permission);

    /**
     * Load all users belonging to any of the given centreIds in a single query.
     * Used by DemandeReminderService to avoid N+1 (was: userRepository.findAll() per demand).
     */
    @EntityGraph(attributePaths = {"profil", "profil.permissions"})
    @Query("SELECT u FROM User u WHERE u.centre.id IN :centreIds")
    List<User> findByCentreIdIn(@Param("centreIds") List<Integer> centreIds);
}
