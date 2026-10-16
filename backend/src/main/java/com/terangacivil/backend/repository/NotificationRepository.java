package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUserIdOrderByDateEnvoiDesc(Integer userId);

    boolean existsByDemandeIdAndTitre(Integer demandeId, String titre);

    /**
     * Single IN-query: returns all demandeIds (from the provided list) that
     * already have a notification with the exact given titre.
     * Replaces N+1 existsByDemandeIdAndTitre calls in the reminder scheduler.
     */
    @Query("SELECT DISTINCT n.demandeId FROM Notification n "
            + "WHERE n.demandeId IN :demandeIds "
            + "AND n.titre = :titre")
    Set<Integer> findDemandeIdsAlreadyNotified(
            @Param("demandeIds") List<Integer> demandeIds,
            @Param("titre") String titre);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.lu = true WHERE n.user.id = :userId")
    void markAllAsRead(@Param("userId") Integer userId);
}
