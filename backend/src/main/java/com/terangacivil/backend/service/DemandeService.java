package com.terangacivil.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.terangacivil.backend.dto.DemandeRequest;
import com.terangacivil.backend.dto.DemandeResponse;
import com.terangacivil.backend.dto.StatusUpdateRequest;
import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DemandeService {

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private RendezVousService rendezVousService;

    @Autowired
    private SseService sseService;

    @Autowired
    private EmailService emailService;

    @Transactional(readOnly = true)
    public Page<DemandeResponse> getDemandesForUser(User currentUser, String statut, String search, Boolean archive, LocalDateTime start, LocalDateTime end, Pageable pageable) {
        // Reload the user with all lazy associations (activities, centre, commune, permissions)
        // to avoid LazyInitializationException in JPA Specifications
        User userWithDetails = userRepository.findByIdWithActivities(currentUser.getId())
                .orElse(currentUser);

        Specification<Demande> spec = Specification.where(DemandeSpecifications.filterByScopeAndRole(userWithDetails))
                .and(DemandeSpecifications.hasStatut(statut))
                .and(DemandeSpecifications.isArchived(archive))
                .and(DemandeSpecifications.searchContains(search))
                .and(DemandeSpecifications.betweenDates(start, end));

        Page<Demande> demandesPage = demandeRepository.findAll(spec, pageable);
        return demandesPage.map(DemandeResponse::new);
    }


    @Transactional
    public DemandeResponse createDemande(DemandeRequest request, User currentUser) {
        Activity activity = activityRepository.findById(request.getActiviteId())
                .orElseThrow(() -> new IllegalArgumentException("Activité non trouvée."));

        Centre centre = centreRepository.findById(request.getCentreId())
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé."));

        Demande demande = new Demande();
        String randomSuffix = String.format("%03d", new Random().nextInt(1000));
        String reference = "DEC-" + System.currentTimeMillis() / 1000 + "-" + randomSuffix;

        demande.setReference(reference);
        demande.setCitoyen(currentUser);
        demande.setActivite(activity);
        demande.setCentre(centre);
        demande.setCommune(centre.getCommune());
        demande.setStatut("en_attente");
        demande.setDonnees(request.getDonnees());
        demande.setDocumentsUrl(request.getDocumentsUrl());
        demande.setMontantPaye(request.getMontantPaye());
        demande.setModePaiement(request.getModePaiement());
        if (request.getMotif() != null) {
            demande.setMotif(request.getMotif());
        }

        if (request.getCentreDelivranceId() != null) {
            Centre centreDeliv = centreRepository.findById(request.getCentreDelivranceId()).orElse(null);
            if (centreDeliv != null && !centreDeliv.getId().equals(centre.getId())) {
                demande.setCentreDelivrance(centreDeliv);
                demande.setStatutTransfert("en_attente_envoi");
            } else {
                demande.setStatutTransfert("none");
            }
        } else {
            demande.setStatutTransfert("none");
        }

        int currentYear = LocalDate.now().getYear();
        Integer maxNumero = demandeRepository.findMaxNumeroByAnneeAndActivite(currentYear, activity.getId());
        int nextNumero = (maxNumero == null) ? 1 : maxNumero + 1;
        demande.setAnnee(currentYear);
        demande.setNumero(nextNumero);

        Demande saved = demandeRepository.save(demande);

        // Workflow
        workflowService.startWorkflowForDemande(saved);

        // Rendez-vous
        if (request.getRendezVous() != null && !request.getRendezVous().isNull()) {
            createRendezVous(request.getRendezVous(), saved);
        }

        // Notification
        sendNotification(currentUser, "Demande enregistrée", 
            "Votre demande d'acte civil (" + activity.getNom() + ") a été reçue sous la référence " + reference + ".", saved.getId());

        sseService.broadcast("refresh_demandes", "created");
        sseService.broadcast("refresh_notifications", "new_notification");

        return new DemandeResponse(saved);
    }

    @Transactional
    public DemandeResponse updateDemande(Integer id, DemandeRequest request, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée."));

        if (!demande.getCitoyen().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Non autorisé à modifier cette demande.");
        }

        if (!"en_attente".equals(demande.getStatut())) {
            throw new IllegalArgumentException("La demande ne peut être modifiée car elle est déjà prise en charge.");
        }

        Activity activity = activityRepository.findById(request.getActiviteId())
                .orElseThrow(() -> new IllegalArgumentException("Activité non trouvée."));
        Centre centre = centreRepository.findById(request.getCentreId())
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé."));

        demande.setActivite(activity);
        demande.setCentre(centre);
        demande.setCommune(centre.getCommune());
        demande.setDonnees(request.getDonnees());
        demande.setDocumentsUrl(request.getDocumentsUrl());
        
        if (request.getMotif() != null) {
            demande.setMotif(request.getMotif());
        }

        if (request.getCentreDelivranceId() != null) {
            Centre centreDeliv = centreRepository.findById(request.getCentreDelivranceId()).orElse(null);
            if (centreDeliv != null && !centreDeliv.getId().equals(centre.getId())) {
                demande.setCentreDelivrance(centreDeliv);
                demande.setStatutTransfert("en_attente_envoi");
            } else {
                demande.setCentreDelivrance(null);
                demande.setStatutTransfert("none");
            }
        } else {
            demande.setCentreDelivrance(null);
            demande.setStatutTransfert("none");
        }

        Demande saved = demandeRepository.save(demande);
        return new DemandeResponse(saved);
    }

    @Transactional
    public void deleteDemande(Integer id, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée."));

        if (!demande.getCitoyen().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Non autorisé à supprimer cette demande.");
        }

        if (!"en_attente".equals(demande.getStatut())) {
            throw new IllegalArgumentException("La demande ne peut être supprimée car elle est déjà prise en charge.");
        }

        demandeRepository.delete(demande);
    }

    private void createRendezVous(JsonNode rdvNode, Demande demande) {
        try {
            if (rdvNode.has("date") && !rdvNode.get("date").isNull() && rdvNode.has("heure") && !rdvNode.get("heure").isNull()) {
                String dateStr = rdvNode.get("date").asText();
                String heureStr = rdvNode.get("heure").asText();
                if (!dateStr.isBlank() && !heureStr.isBlank()) {
                    LocalDate rdvDate = LocalDate.parse(dateStr);
                    LocalTime rdvHeure = LocalTime.parse(heureStr);
                    rendezVousService.reserver(demande.getId(), demande.getCentre().getId(), rdvDate, rdvHeure);
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur creation rdv online: " + e.getMessage());
        }
    }

    @Transactional
    public DemandeResponse updateDemandeStatus(Integer id, StatusUpdateRequest request, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));

        String newStatut = request.getStatut().toLowerCase();
        validateStatusTransition(demande.getStatut(), newStatut, currentUser, request.getMotif_rejet());

        if ("en_cours".equals(newStatut)) {
            demande.setAgent(currentUser);
        } else if ("valide".equals(newStatut)) {
            demande.setOfficier(currentUser);
            demande.setDateValidation(LocalDateTime.now());
            demande.setDateDisponibilite(LocalDateTime.now().plusDays(2));
            if (demande.getCentreDelivrance() != null && !demande.getCentreDelivrance().getId().equals(demande.getCentre().getId())) {
                demande.setStatutTransfert("pret_a_expedier");
            } else {
                demande.setStatutTransfert("none");
            }
        } else if ("signature".equals(newStatut) && request.getOfficier_id() != null) {
            userRepository.findById(request.getOfficier_id()).ifPresent(demande::setOfficier);
        } else if ("rejete".equals(newStatut)) {
            demande.setDateValidation(LocalDateTime.now());
            if (request.getMotif_rejet() != null && !request.getMotif_rejet().isBlank()) {
                demande.setMotifRejet(request.getMotif_rejet());
            }
        } else if ("en_traitement".equals(newStatut) && "signature".equals(demande.getStatut())) {
            demande.setMotifRejet(request.getMotif_rejet());
        }

        demande.setStatut(newStatut);
        Demande saved = demandeRepository.save(demande);

        notifyStatusChange(saved, newStatut);
        
        sseService.broadcast("refresh_demandes", "status_updated");
        sseService.broadcast("refresh_notifications", "new_notification");

        return new DemandeResponse(saved);
    }

    @Transactional
    public List<DemandeResponse> bulkSign(User currentUser) {
        Specification<Demande> spec = Specification.where(DemandeSpecifications.hasStatut("signature"))
            .and((root, query, cb) -> cb.equal(root.get("officier").get("id"), currentUser.getId()));

        List<Demande> demandes = demandeRepository.findAll(spec);
        List<DemandeResponse> responses = new ArrayList<>();

        for (Demande demande : demandes) {
            demande.setStatut("valide");
            demande.setOfficier(currentUser);
            demande.setDateValidation(LocalDateTime.now());
            demande.setDateDisponibilite(LocalDateTime.now().plusDays(2));
            if (demande.getCentreDelivrance() != null && !demande.getCentreDelivrance().getId().equals(demande.getCentre().getId())) {
                demande.setStatutTransfert("pret_a_expedier");
            } else {
                demande.setStatutTransfert("none");
            }
            
            Demande saved = demandeRepository.save(demande);
            notifyStatusChange(saved, "valide");
            responses.add(new DemandeResponse(saved));
        }

        if (!demandes.isEmpty()) {
            sseService.broadcast("refresh_demandes", "bulk_status_updated");
            sseService.broadcast("refresh_notifications", "new_notification");
        }

        return responses;
    }

    private void validateStatusTransition(String currentStatut, String targetStatut, User currentUser, String motifRejet) {
        if ("valide".equals(targetStatut) || "pret".equals(targetStatut)) {
            boolean isOfficer = currentUser.hasPermission("GERER_SERVICES") || currentUser.hasPermission("GERER_BUREAU") || 
                                currentUser.hasPermission("GERER_CENTRE") || currentUser.hasPermission("GERER_COMMUNE") || 
                                currentUser.hasPermission("GERER_DEPARTEMENT") || currentUser.hasPermission("GERER_REGION") || 
                                currentUser.hasPermission("GERER_GLOBAL");
            if (!isOfficer) {
                throw new IllegalArgumentException("Seul un officier peut valider, signer ou marquer un dossier comme prêt.");
            }
        }

        Map<String, Integer> statusOrder = new HashMap<>();
        statusOrder.put("en_attente", 0);
        statusOrder.put("en_cours", 1);
        statusOrder.put("verification_dossier", 2);
        statusOrder.put("en_traitement", 3);
        statusOrder.put("signature", 4);
        statusOrder.put("valide", 5);
        statusOrder.put("pret", 6);
        statusOrder.put("disponible", 7);

        if (!"rejete".equals(targetStatut) && !"recours".equals(targetStatut) && !"hors_delais".equals(targetStatut)) {
            if ("recours".equals(currentStatut)) {
                if (!"en_cours".equals(targetStatut)) {
                     throw new IllegalArgumentException("D'un recours, la demande doit repasser 'en_cours'.");
                }
            } else if ("signature".equals(currentStatut) && "en_traitement".equals(targetStatut)) {
                if (motifRejet == null || motifRejet.isBlank()) {
                    throw new IllegalArgumentException("Un motif est obligatoire pour retourner le dossier à l'agent.");
                }
            } else {
                Integer currentIndex = statusOrder.getOrDefault(currentStatut, -1);
                Integer targetIndex = statusOrder.getOrDefault(targetStatut, -1);
                
                if (currentIndex != -1 && targetIndex != -1 && targetIndex <= currentIndex) {
                    throw new IllegalArgumentException("Action interdite : vous ne pouvez pas revenir en arrière (" + currentStatut + " -> " + targetStatut + ").");
                }
            }
        }
    }

    private void notifyStatusChange(Demande demande, String newStatut) {
        String activityNom = (demande.getActivite() != null) ? demande.getActivite().getNom() : "Acte civil";
        String titre = null;
        String contenu = null;

        if ("valide".equals(newStatut)) {
            titre = "Demande validée";
            if (demande.getCentreDelivrance() != null && !demande.getCentreDelivrance().getId().equals(demande.getCentre().getId())) {
                contenu = "Votre demande d'acte civil (" + activityNom + ") " + demande.getReference() + " a été validée et signée. Elle est en cours d'expédition vers le centre de délivrance : " + demande.getCentreDelivrance().getNom() + ".";
            } else {
                contenu = "Félicitations, votre demande d'acte civil (" + activityNom + ") " + demande.getReference() + " a été validée et signée.";
            }
        } else if ("rejete".equals(newStatut)) {
            titre = "Demande rejetée";
            String motif = demande.getMotifRejet() != null ? demande.getMotifRejet() : "Non spécifié";
            contenu = "Votre demande d'acte civil (" + activityNom + ") " + demande.getReference() + " a été rejetée. Motif : " + motif;
        } else if ("disponible".equals(newStatut) || "pret".equals(newStatut)) {
            titre = "Acte disponible";
            contenu = "Votre acte civil (" + activityNom + ") " + demande.getReference() + " est désormais disponible.";
        } else if ("en_cours".equals(newStatut)) {
            titre = "Prise en charge";
            contenu = "Votre demande d'acte civil (" + activityNom + ") " + demande.getReference() + " a été prise en charge et est en cours d'examen.";
        } else if ("verification_dossier".equals(newStatut)) {
            titre = "Vérification des pièces";
            contenu = "Les pièces de votre demande d'acte civil (" + activityNom + ") " + demande.getReference() + " sont en cours de vérification.";
        } else if ("en_traitement".equals(newStatut)) {
            titre = "Demande en traitement";
            contenu = "Votre demande d'acte civil (" + activityNom + ") " + demande.getReference() + " est en cours de traitement.";
        } else if ("signature".equals(newStatut)) {
            titre = "Dossier à signer";
            contenu = "Votre dossier d'acte civil (" + activityNom + ") " + demande.getReference() + " a été transmis à l'officier pour signature.";
            notifyOfficer(demande, activityNom);
        }

        if (titre != null) {
            sendNotification(demande.getCitoyen(), titre, contenu, demande.getId());
            if (demande.getCitoyen() != null && demande.getCitoyen().getEmail() != null) {
                sendEmail(demande.getCitoyen().getEmail(), titre, contenu);
            }
        }
    }

    private void notifyOfficer(Demande demande, String activityNom) {
        String titre = "Nouveau dossier à signer";
        String contenu = "Le dossier " + demande.getReference() + " (" + activityNom + ") a été transmis par l'agent pour signature.";
        
        if (demande.getOfficier() != null) {
            sendNotification(demande.getOfficier(), titre, contenu, demande.getId());
            if (demande.getOfficier().getEmail() != null) {
                sendEmail(demande.getOfficier().getEmail(), titre, contenu);
            }
        } else if (demande.getCentre() != null) {
            List<User> officers = userRepository.findAll().stream() // Ideally this should be a DB query
                .filter(u -> u.getCentre() != null && u.getCentre().getId().equals(demande.getCentre().getId())
                        && (u.hasPermission("GERER_SERVICES") || u.hasPermission("GERER_BUREAU") || u.hasPermission("GERER_CENTRE")))
                .collect(Collectors.toList());

            for (User officer : officers) {
                sendNotification(officer, titre, contenu, demande.getId());
                if (officer.getEmail() != null) {
                    sendEmail(officer.getEmail(), titre, contenu);
                }
            }
        }
    }

    private void sendNotification(User user, String titre, String contenu, Integer demandeId) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType("push");
        notification.setTitre(titre);
        notification.setContenu(contenu);
        notification.setDemandeId(demandeId);
        notificationRepository.save(notification);
    }

    private void sendEmail(String email, String titre, String contenu) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("title", titre);
        vars.put("message", contenu);
        emailService.sendHtmlEmail(email, titre + " - SenInnov", "email-template", vars);
    }

    @Transactional
    public DemandeResponse submitRecours(Integer id, DemandeRequest request, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));

        if (!demande.getCitoyen().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }
        if (!"rejete".equalsIgnoreCase(demande.getStatut())) {
            throw new IllegalArgumentException("Seuls les dossiers rejetés peuvent faire l'objet d'un recours.");
        }

        demande.setDonnees(request.getDonnees());
        demande.setDocumentsUrl(request.getDocumentsUrl());
        demande.setStatut("recours");
        demande.setDateSoumission(LocalDateTime.now());

        Demande saved = demandeRepository.save(demande);

        sendNotification(currentUser, "Recours soumis", "Votre recours pour la demande " + demande.getReference() + " a bien été enregistré.", saved.getId());
        sseService.broadcast("refresh_demandes", "recours_submitted");
        sseService.broadcast("refresh_notifications", "new_notification");

        return new DemandeResponse(saved);
    }

    @Transactional
    public DemandeResponse toggleArchive(Integer id, Boolean archive, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));

        if (!currentUser.hasPermission("GERER_BUREAU") && !currentUser.hasPermission("GERER_COMMUNE") && 
            !currentUser.hasPermission("GERER_GLOBAL") && !currentUser.hasPermission("GERER_ARCHIVE")) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }

        if (archive && !"valide".equalsIgnoreCase(demande.getStatut()) && !"pret".equalsIgnoreCase(demande.getStatut()) && !"disponible".equalsIgnoreCase(demande.getStatut()) && !"valide_cloture".equalsIgnoreCase(demande.getStatut())) {
            throw new IllegalArgumentException("Seuls les dossiers finalisés peuvent être archivés.");
        }

        demande.setArchive(archive);
        demande.setArchiveDate(archive ? LocalDateTime.now() : null);
        Demande saved = demandeRepository.save(demande);
        sseService.broadcast("refresh_demandes", "archive_updated");

        return new DemandeResponse(saved);
    }

    @Transactional
    public Map<String, Object> syncDemandes(List<Map<String, Object>> demandesMap, User currentUser) {
        int synced = 0;
        ObjectMapper mapper = new ObjectMapper();
        
        for (Map<String, Object> req : demandesMap) {
            Map<String, Object> reqData = (Map<String, Object>) req.get("data");
            
            Integer activiteId = Integer.parseInt(reqData.get("activiteId").toString());
            Activity activity = activityRepository.findById(activiteId).orElseThrow();
                    
            Integer centreId = Integer.parseInt(reqData.get("centreId").toString());
            Centre centre = centreRepository.findById(centreId).orElseThrow();

            Demande demande = new Demande();
            String reference = "DEC-" + System.currentTimeMillis() / 1000 + "-" + String.format("%03d", new Random().nextInt(1000));

            demande.setReference(reference);
            demande.setCitoyen(currentUser);
            demande.setActivite(activity);
            demande.setCentre(centre);
            demande.setCommune(centre.getCommune());
            demande.setStatut("en_attente");
            demande.setDonnees(mapper.valueToTree(reqData.get("donnees")));
            demande.setDocumentsUrl(mapper.valueToTree(reqData.get("documentsUrl")));
            if (reqData.get("montantPaye") != null) demande.setMontantPaye((int) Double.parseDouble(reqData.get("montantPaye").toString()));
            if (reqData.get("modePaiement") != null) demande.setModePaiement((String) reqData.get("modePaiement"));
            if (reqData.get("motif") != null) demande.setMotif((String) reqData.get("motif"));

            Object delivIdObj = reqData.containsKey("centreDelivranceId") ? reqData.get("centreDelivranceId") : reqData.get("centre_delivrance_id");
            if (delivIdObj != null) {
                try {
                    Integer delivId = Integer.parseInt(delivIdObj.toString());
                    Centre centreDeliv = centreRepository.findById(delivId).orElse(null);
                    if (centreDeliv != null && !centreDeliv.getId().equals(centre.getId())) {
                        demande.setCentreDelivrance(centreDeliv);
                        demande.setStatutTransfert("en_attente_envoi");
                    } else {
                        demande.setStatutTransfert("none");
                    }
                } catch (Exception e) {
                    demande.setStatutTransfert("none");
                }
            } else {
                demande.setStatutTransfert("none");
            }

            int currentYear = LocalDate.now().getYear();
            Integer maxNumero = demandeRepository.findMaxNumeroByAnneeAndActivite(currentYear, activity.getId());
            int nextNumero = (maxNumero == null) ? 1 : maxNumero + 1;
            demande.setAnnee(currentYear);
            demande.setNumero(nextNumero);

            Demande saved = demandeRepository.save(demande);
            workflowService.startWorkflowForDemande(saved);
            synced++;

            if (reqData.containsKey("rendez_vous") && reqData.get("rendez_vous") != null) {
                createRendezVous(mapper.valueToTree(reqData.get("rendez_vous")), saved);
            }
            
            sendNotification(currentUser, "Demande enregistrée", "Votre demande d'acte civil a été synchronisée.", saved.getId());
        }
        sseService.broadcast("refresh_demandes", "synced");
        sseService.broadcast("refresh_notifications", "new_notifications");
        
        Map<String, Object> result = new HashMap<>();
        result.put("synced_count", synced);
        return result;
    }

    @Transactional
    public DemandeResponse finaliserDemande(Integer id, User currentUser) {
        Demande demande = demandeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));
        if ("valide".equalsIgnoreCase(demande.getStatut()) || "rejete".equalsIgnoreCase(demande.getStatut())) {
            throw new IllegalArgumentException("La demande est déjà validée ou rejetée.");
        }

        demande.setOfficier(currentUser);
        demande.setStatut("valide");
        demande.setDateValidation(java.time.LocalDateTime.now());
        if (demande.getCentreDelivrance() != null && !demande.getCentreDelivrance().getId().equals(demande.getCentre().getId())) {
            demande.setStatutTransfert("pret_a_expedier");
        } else {
            demande.setStatutTransfert("none");
        }

        // Auto-generate document if a template exists
        List<DocumentTemplate> templates = documentTemplateRepository.findByActiviteId(demande.getActivite().getId());
        if (templates != null && !templates.isEmpty()) {
            try {
                String generatedUrl = documentGeneratorService.generateDocument(demande, templates.get(0), currentUser);
                demande.setDocumentFinalUrl(generatedUrl);
            } catch (Exception e) {
                System.err.println("Erreur de génération automatique du document lors de la validation: " + e.getMessage());
            }
        }
        Demande saved = demandeRepository.save(demande);
        return new DemandeResponse(saved);
    }

    @Transactional
    public DemandeResponse prendreEnCharge(Integer id, User currentUser) {
        Demande demande = demandeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));
        if (!"en_attente".equals(demande.getStatut())) {
            throw new IllegalArgumentException("La demande n'est pas en attente.");
        }

        demande.setAgent(currentUser);
        demande.setStatut("en_cours");
        Demande saved = demandeRepository.save(demande);
        return new DemandeResponse(saved);
    }

    public Demande getDemandeForPdf(Integer id, User currentUser) {
        Demande demande = demandeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));
        
        String statut = demande.getStatut();
        if (!"valide".equalsIgnoreCase(statut) && !"disponible".equalsIgnoreCase(statut) && !"pret".equalsIgnoreCase(statut)) {
            throw new IllegalArgumentException("Le document n'est pas encore signé et validé.");
        }

        return demande;
    }

    @Transactional
    public DemandeResponse updateTransfertStatus(Integer id, String status, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));

        if (!"recu".equalsIgnoreCase(status)) {
            throw new IllegalArgumentException("Statut de transfert invalide. Seul 'recu' est accepté.");
        }

        if (currentUser.getCentre() == null || demande.getCentreDelivrance() == null || 
            !demande.getCentreDelivrance().getId().equals(currentUser.getCentre().getId())) {
            throw new SecurityException("Accès non autorisé : vous devez appartenir au centre de délivrance.");
        }

        demande.setStatutTransfert("recu");
        demande.setStatut("pret");
        
        Notification notification = new Notification();
        notification.setUser(demande.getCitoyen());
        notification.setType("push");
        notification.setDemandeId(demande.getId());
        notification.setTitre("Acte prêt pour retrait");
        notification.setContenu("Votre document d'acte civil " + demande.getReference() + " est arrivé et est prêt à être récupéré au centre de délivrance : " + demande.getCentreDelivrance().getNom() + ".");
        notificationRepository.save(notification);

        Demande saved = demandeRepository.save(demande);
        return new DemandeResponse(saved);
    }

    @Transactional
    public DemandeResponse expedierTransfert(Integer id, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));

        if (currentUser.getCentre() == null || demande.getCentre() == null || 
            !demande.getCentre().getId().equals(currentUser.getCentre().getId())) {
            throw new SecurityException("Accès non autorisé : seul le centre traitant peut expédier le document.");
        }

        if (!"pret_a_expedier".equals(demande.getStatutTransfert()) && !"en_attente_envoi".equals(demande.getStatutTransfert())) {
            throw new IllegalArgumentException("Le document n'est pas prêt à être expédié.");
        }

        demande.setStatutTransfert("en_transit");
        
        Notification notification = new Notification();
        notification.setUser(demande.getCitoyen());
        notification.setType("push");
        notification.setDemandeId(demande.getId());
        notification.setTitre("Document expédié");
        notification.setContenu("Votre document " + demande.getReference() + " a été expédié vers le centre de délivrance : " + demande.getCentreDelivrance().getNom() + ".");
        notificationRepository.save(notification);

        Demande saved = demandeRepository.save(demande);
        return new DemandeResponse(saved);
    }

    @Autowired
    private DocumentTemplateRepository documentTemplateRepository;

    @Autowired
    private DocumentGeneratorService documentGeneratorService;

    @Transactional
    public DemandeResponse addTransfertMessage(Integer id, String messageText, User currentUser) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));

        if (messageText == null || messageText.isBlank()) {
            throw new IllegalArgumentException("Le texte du message est requis.");
        }

        String userRole = currentUser.getProfil() != null ? currentUser.getProfil().getNom() : "";
        boolean isOfficerOrAbove = "officier".equalsIgnoreCase(userRole) 
                || "directeur".equalsIgnoreCase(userRole)
                || "super_admin".equalsIgnoreCase(userRole);
        
        if (!isOfficerOrAbove) {
            throw new SecurityException("Accès non autorisé : seuls les officiers et directeurs peuvent communiquer sur le transfert.");
        }

        boolean belongsToTreatment = currentUser.getCentre() != null && demande.getCentre() != null && 
                currentUser.getCentre().getId().equals(demande.getCentre().getId());
        boolean belongsToDelivery = currentUser.getCentre() != null && demande.getCentreDelivrance() != null && 
                currentUser.getCentre().getId().equals(demande.getCentreDelivrance().getId());
        boolean isGlobalAdmin = "super_admin".equalsIgnoreCase(userRole);

        if (!belongsToTreatment && !belongsToDelivery && !isGlobalAdmin) {
            throw new SecurityException("Accès non autorisé : vous devez appartenir au centre de traitement ou au centre de délivrance.");
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.node.ArrayNode messagesArray;

        if (demande.getDiscussionTransfert() != null && demande.getDiscussionTransfert().isArray()) {
            messagesArray = (com.fasterxml.jackson.databind.node.ArrayNode) demande.getDiscussionTransfert();
        } else {
            messagesArray = mapper.createArrayNode();
        }

        com.fasterxml.jackson.databind.node.ObjectNode msgNode = mapper.createObjectNode();
        msgNode.put("auteur", currentUser.getNomComplet());
        msgNode.put("role", userRole);
        msgNode.put("centre", currentUser.getCentre() != null ? currentUser.getCentre().getNom() : "Administration");
        msgNode.put("message", messageText);
        msgNode.put("date", LocalDateTime.now().toString());

        messagesArray.add(msgNode);
        demande.setDiscussionTransfert(messagesArray);
        
        Demande saved = demandeRepository.save(demande);
        return new DemandeResponse(saved);
    }

    @Transactional
    public Map<String, Object> genererDocument(Integer id, Integer templateId, User currentUser) {
        Demande demande = demandeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));
        DocumentTemplate template = documentTemplateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle introuvable"));

        String generatedUrl;
        try {
            generatedUrl = documentGeneratorService.generateDocument(demande, template, currentUser);
        } catch (Exception e) {
            throw new RuntimeException("Erreur de génération du document: " + e.getMessage(), e);
        }
        
        if ("DOCX".equalsIgnoreCase(template.getType())) {
            demande.setDocumentDraftUrl(generatedUrl);
        } else {
            demande.setDocumentFinalUrl(generatedUrl);
        }
        
        Demande saved = demandeRepository.save(demande);
        Map<String, Object> result = new HashMap<>();
        result.put("demande", new DemandeResponse(saved));
        result.put("url", generatedUrl);
        return result;
    }

    @Transactional
    public DemandeResponse uploadFinalDocument(Integer id, String url) {
        Demande demande = demandeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));
        demande.setDocumentFinalImporteUrl(url); 
        return new DemandeResponse(demandeRepository.save(demande));
    }

    @Transactional
    public String getDemandePdfUrl(Integer id, User currentUser) {
        Demande demande = getDemandeForPdf(id, currentUser);

        boolean isCitizenOwner = demande.getCitoyen() != null && demande.getCitoyen().getId().equals(currentUser.getId());
        boolean isAdminOrAgent = currentUser.hasPermission("GERER_GLOBAL") || currentUser.hasPermission("GERER_REGION") || 
                                 currentUser.hasPermission("GERER_DEPARTEMENT") || currentUser.hasPermission("GERER_COMMUNE") || 
                                 currentUser.hasPermission("GERER_CENTRE") || currentUser.hasPermission("GERER_BUREAU") || 
                                 currentUser.hasPermission("GERER_SERVICES") || currentUser.hasPermission("GERER_ACTIVITES");

        if (!isCitizenOwner && !isAdminOrAgent) {
            throw new SecurityException("Accès non autorisé.");
        }

        // Priority 1: Manually imported/signed final document — always respect it as-is
        if (demande.getDocumentFinalImporteUrl() != null && !demande.getDocumentFinalImporteUrl().isEmpty()) {
            return demande.getDocumentFinalImporteUrl();
        }

        // Priority 2: Always regenerate from the LATEST template so that any template
        // update is immediately reflected in future downloads of existing demands.
        List<DocumentTemplate> templates = documentTemplateRepository.findByActiviteId(demande.getActivite().getId());

        if (templates != null && !templates.isEmpty()) {
            DocumentTemplate template = templates.stream()
                .filter(t -> Boolean.TRUE.equals(t.getActif()) && Boolean.TRUE.equals(t.getPrincipal()))
                .findFirst()
                .orElseGet(() -> templates.stream()
                    .filter(t -> Boolean.TRUE.equals(t.getActif()))
                    .findFirst()
                    .orElse(templates.get(0)));
            User officier = demande.getOfficier();
            String generatedUrl;
            try {
                generatedUrl = documentGeneratorService.generateDocument(demande, template, officier);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de la génération du PDF: " + e.getMessage(), e);
            }
            demande.setDocumentFinalUrl(generatedUrl);
            demandeRepository.save(demande);
            return generatedUrl;
        }

        // Priority 3: No template found — fall back to the last cached PDF if available
        if (demande.getDocumentFinalUrl() != null && !demande.getDocumentFinalUrl().isEmpty()
                && demande.getDocumentFinalUrl().endsWith(".pdf")) {
            return demande.getDocumentFinalUrl();
        }

        throw new IllegalStateException("Aucun modèle de document disponible pour cette activité. Veuillez vous rendre sur place.");
    }
}
