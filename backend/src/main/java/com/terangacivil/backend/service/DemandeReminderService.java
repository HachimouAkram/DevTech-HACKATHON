package com.terangacivil.backend.service;

import com.terangacivil.backend.model.Demande;
import com.terangacivil.backend.model.Notification;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.DemandeRepository;
import com.terangacivil.backend.repository.NotificationRepository;
import com.terangacivil.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DemandeReminderService {

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SseService sseService;

    @Autowired
    private EmailService emailService;

    /**
     * Run every 10 minutes (was every 1 min — reduced to spare resources).
     *
     * Performance fixes applied vs. original implementation:
     *  1. Uses findActiveDemandesForReminder() which JOINs activite/agent/centre
     *     in a SINGLE query — no lazy-load cascade inside the loop.
     *  2. Collects all demandeIds first, then does TWO bulk IN-queries to find
     *     which ones are already notified — replaces N+1 existsByDemandeIdAndTitre.
     *  3. Collects all centreIds for unassigned demands, then does ONE
     *     userRepository query instead of userRepository.findAll() per demand.
     */
    @Scheduled(fixedRate = 600_000) // every 10 minutes
    @Transactional
    public void checkDeadlinesAndSendNotifications() {
        System.out.println("[Reminder Service] Running deadline and reminder checks...");

        // --- Step 1: Load active demands in ONE join query ---
        List<Demande> activeDemandes = demandeRepository.findActiveDemandesForReminder();
        if (activeDemandes.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();

        // Classify each demand
        List<Demande> warningDemandes = new ArrayList<>();
        List<Demande> expiredDemandes = new ArrayList<>();

        for (Demande d : activeDemandes) {
            if (d.getActivite() == null) continue;

            int delaiMaxJours = Optional.ofNullable(d.getActivite().getDelaiMaxJours())
                    .filter(v -> v > 0).orElse(2);

            LocalDateTime dateSoumission = Optional.ofNullable(d.getDateSoumission()).orElse(now);
            LocalDateTime deadline = dateSoumission.plusDays(delaiMaxJours);
            long hoursRemaining = Duration.between(now, deadline).toHours();

            if (hoursRemaining >= 0 && hoursRemaining <= 24) {
                warningDemandes.add(d);
            } else if (hoursRemaining < 0) {
                expiredDemandes.add(d);
            }
        }

        // --- Step 2: Batch-check which demands are already notified (2 queries total) ---
        String warningTitre = "Rappel : Échéance proche (1 jour)";
        String expiredTitre = "Alerte : Délai de traitement dépassé (Expiré)";

        Set<Integer> alreadyWarnedIds = batchAlreadyNotified(warningDemandes, warningTitre);
        Set<Integer> alreadyExpiredIds = batchAlreadyNotified(expiredDemandes, expiredTitre);

        // Filter only new ones
        List<Demande> toWarn = warningDemandes.stream()
                .filter(d -> !alreadyWarnedIds.contains(d.getId()))
                .collect(Collectors.toList());

        List<Demande> toExpire = expiredDemandes.stream()
                .filter(d -> !alreadyExpiredIds.contains(d.getId()))
                .collect(Collectors.toList());

        boolean dbUpdated = false;

        // --- Step 3: Update statut to hors_delais in batch ---
        for (Demande d : expiredDemandes) {
            if (!"hors_delais".equalsIgnoreCase(d.getStatut())) {
                d.setStatut("hors_delais");
                demandeRepository.save(d);
                dbUpdated = true;
                System.out.println("[Reminder Service] Status → hors_delais: " + d.getReference());
            }
        }

        // --- Step 4: Pre-load centre users in ONE query for unassigned demands ---
        Set<Integer> centreIds = new HashSet<>();
        for (Demande d : toWarn) {
            if (d.getAgent() == null && d.getCentre() != null) centreIds.add(d.getCentre().getId());
        }
        for (Demande d : toExpire) {
            if (d.getAgent() == null && d.getCentre() != null) centreIds.add(d.getCentre().getId());
        }

        // Map centreId → list of responsible users (loaded in ONE query)
        Map<Integer, List<User>> centreUserMap = new HashMap<>();
        if (!centreIds.isEmpty()) {
            List<User> allCentreUsers = userRepository.findByCentreIdIn(new ArrayList<>(centreIds));
            for (User u : allCentreUsers) {
                if (u.getCentre() != null && u.hasPermission("GERER_CENTRE")) {
                    centreUserMap.computeIfAbsent(u.getCentre().getId(), k -> new ArrayList<>()).add(u);
                }
            }
        }

        // --- Step 5: Send notifications ---
        boolean sentAny = false;
        for (Demande d : toWarn) {
            String msg = "Rappel : Il reste moins de 24 heures pour traiter la demande de type "
                    + d.getActivite().getNom() + " (Réf: " + d.getReference() + ").";
            sentAny |= sendNotifications(d, warningTitre, msg, centreUserMap);
        }
        for (Demande d : toExpire) {
            int delai = Optional.ofNullable(d.getActivite().getDelaiMaxJours()).filter(v -> v > 0).orElse(2);
            String msg = "Alerte : Le délai de traitement maximum de " + delai
                    + " jours a été dépassé pour la demande " + d.getActivite().getNom()
                    + " (Réf: " + d.getReference() + "). Le dossier est marqué hors délais.";
            sentAny |= sendNotifications(d, expiredTitre, msg, centreUserMap);
        }

        // --- Step 6: Broadcast SSE events ---
        if (dbUpdated) {
            try { sseService.broadcast("refresh_demandes", "status_updated"); }
            catch (Exception e) { System.err.println("[Reminder] SSE demandes failed: " + e.getMessage()); }
        }
        if (sentAny) {
            try { sseService.broadcast("refresh_notifications", "new_notification"); }
            catch (Exception e) { System.err.println("[Reminder] SSE notifications failed: " + e.getMessage()); }
        }

        System.out.println("[Reminder Service] Done. Warned=" + toWarn.size() + " Expired=" + toExpire.size());
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private Set<Integer> batchAlreadyNotified(List<Demande> demandes, String titre) {
        if (demandes.isEmpty()) return Collections.emptySet();
        List<Integer> ids = demandes.stream().map(Demande::getId).collect(Collectors.toList());
        return notificationRepository.findDemandeIdsAlreadyNotified(ids, titre);
    }

    private boolean sendNotifications(Demande d, String titre, String contenu,
                                       Map<Integer, List<User>> centreUserMap) {
        List<User> targets = new ArrayList<>();
        if (d.getAgent() != null) {
            targets.add(d.getAgent());
        } else if (d.getCentre() != null) {
            targets.addAll(centreUserMap.getOrDefault(d.getCentre().getId(), Collections.emptyList()));
        }

        boolean sent = false;
        for (User u : targets) {
            try {
                Notification notif = new Notification();
                notif.setUser(u);
                notif.setType("push");
                notif.setTitre(titre);
                notif.setContenu(contenu);
                notif.setDemandeId(d.getId());
                notificationRepository.save(notif);
                sent = true;

                if (u.getEmail() != null && !u.getEmail().isEmpty()) {
                    Map<String, Object> vars = new HashMap<>();
                    vars.put("title", titre);
                    vars.put("message", contenu);
                    emailService.sendHtmlEmail(u.getEmail(), titre + " - Teranga Civil",
                            "email-template", vars);
                }
                System.out.println("[Reminder] Notified: " + u.getNomComplet() + " → " + titre);
            } catch (Exception e) {
                System.err.println("[Reminder] Error notifying user: " + e.getMessage());
            }
        }
        return sent;
    }
}
