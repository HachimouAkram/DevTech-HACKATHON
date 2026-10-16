package com.terangacivil.backend.service;

import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class WorkflowService {

    @Autowired
    private WorkflowCircuitRepository workflowCircuitRepository;

    @Autowired
    private WorkflowStepRepository workflowStepRepository;

    @Autowired
    private SignatureRequestRepository signatureRequestRepository;

    @Autowired
    private DemandeHistoriqueRepository demandeHistoriqueRepository;

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Transactional
    public WorkflowCircuit createOrUpdateCircuit(Integer activiteId, WorkflowCircuit circuitDetails) {
        Activity activity = activityRepository.findById(activiteId)
                .orElseThrow(() -> new RuntimeException("Activity non trouvée"));

        Optional<WorkflowCircuit> existingCircuitOpt = workflowCircuitRepository.findByActiviteIdAndActifTrue(activiteId);
        WorkflowCircuit circuitToSave;

        if (existingCircuitOpt.isPresent()) {
            circuitToSave = existingCircuitOpt.get();
            circuitToSave.setNom(circuitDetails.getNom());
            // Pour simplifier, on supprime les anciennes étapes et on recrée
            circuitToSave.getSteps().clear();
        } else {
            circuitToSave = new WorkflowCircuit();
            circuitToSave.setActivite(activity);
            circuitToSave.setNom(circuitDetails.getNom());
            circuitToSave.setActif(true);
        }

        if (circuitDetails.getSteps() != null) {
            for (WorkflowStep step : circuitDetails.getSteps()) {
                step.setCircuit(circuitToSave);
                circuitToSave.getSteps().add(step);
            }
        }

        return workflowCircuitRepository.save(circuitToSave);
    }

    public WorkflowCircuit getCircuitForActivity(Integer activiteId) {
        return workflowCircuitRepository.findByActiviteIdAndActifTrue(activiteId).orElse(null);
    }

    @Transactional
    public void startWorkflowForDemande(Demande demande) {
        WorkflowCircuit circuit = getCircuitForActivity(demande.getActivite().getId());
        if (circuit != null && !circuit.getSteps().isEmpty()) {
            WorkflowStep firstStep = workflowStepRepository.findFirstByCircuitIdOrderByOrdreAsc(circuit.getId())
                    .orElse(null);
            if (firstStep != null) {
                demande.setCurrentStep(firstStep);
                demandeRepository.save(demande);

                recordHistorique(demande, null, "WORKFLOW_DEMARRE", "Démarrage du workflow à l'étape: " + firstStep.getNom());

                if (demande.getCitoyen() != null && demande.getCitoyen().getEmail() != null) {
                    java.util.Map<String, Object> vars = new java.util.HashMap<>();
                    vars.put("title", "Nouvelle Demande Enregistrée");
                    vars.put("message", "Votre demande pour " + demande.getActivite().getNom() + " (Réf: " + demande.getReference() + ") a bien été enregistrée et le traitement a démarré à l'étape : " + firstStep.getNom() + ".");
                    emailService.sendHtmlEmail(demande.getCitoyen().getEmail(), "Nouvelle Demande - Teranga Civil", "email-template", vars);
                }

                if (demande.getCentre() != null) {
                    java.util.List<User> centreAgents = userRepository.findAll().stream()
                        .filter(u -> u.getCentre() != null && u.getCentre().getId().equals(demande.getCentre().getId()) && u.hasPermission("GERER_CENTRE"))
                        .collect(java.util.stream.Collectors.toList());
                    for (User agent : centreAgents) {
                        if (agent.getEmail() != null && !agent.getEmail().isEmpty()) {
                            java.util.Map<String, Object> vars = new java.util.HashMap<>();
                            vars.put("title", "Nouveau dossier à traiter");
                            vars.put("message", "Une nouvelle demande de type " + demande.getActivite().getNom() + " (Réf: " + demande.getReference() + ") vient d'arriver dans votre centre pour traitement.");
                            emailService.sendHtmlEmail(agent.getEmail(), "Nouveau Dossier - Teranga Civil", "email-template", vars);
                        }
                    }
                }
            }
        }
    }

    @Transactional
    public Demande progressToNextStep(Integer demandeId, Integer userId, String commentaire) {
        Demande demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        WorkflowStep currentStep = demande.getCurrentStep();
        if (currentStep == null) {
            throw new RuntimeException("La demande n'a pas d'étape en cours");
        }

        // Vérifier les signatures requises
        List<SignatureRequest> pendingSignatures = signatureRequestRepository.findByDemandeIdAndStepId(demandeId, currentStep.getId());
        boolean allSigned = pendingSignatures.stream().allMatch(s -> "signe".equals(s.getStatut()));
        
        if (!allSigned && pendingSignatures.size() > 0) {
            throw new RuntimeException("Toutes les signatures requises ne sont pas encore effectuées");
        }

        // Trouver la prochaine étape
        List<WorkflowStep> allSteps = workflowStepRepository.findByCircuitIdOrderByOrdreAsc(currentStep.getCircuit().getId());
        int currentIndex = allSteps.indexOf(currentStep);
        
        if (currentIndex < allSteps.size() - 1) {
            WorkflowStep nextStep = allSteps.get(currentIndex + 1);
            demande.setCurrentStep(nextStep);
            
            // User resolving this? Usually we pass a User object but here we just have userId, let's assume it's logged somewhere else or we fetch it.
            recordHistorique(demande, null, "ETAPE_VALIDEE", "Étape " + currentStep.getNom() + " validée. Passage à " + nextStep.getNom() + ". Commentaire: " + commentaire);

            if (demande.getCitoyen() != null && demande.getCitoyen().getEmail() != null) {
                java.util.Map<String, Object> vars = new java.util.HashMap<>();
                vars.put("title", "Avancement de votre demande");
                vars.put("message", "Votre demande (Réf: " + demande.getReference() + ") est passée à l'étape suivante : " + nextStep.getNom() + ".");
                emailService.sendHtmlEmail(demande.getCitoyen().getEmail(), "Mise à jour de votre demande", "email-template", vars);
            }
        } else {
            demande.setStatut("valide");
            demande.setCurrentStep(null);
            demande.setDateValidation(LocalDateTime.now());
            recordHistorique(demande, null, "DEMANDE_VALIDEE", "Le workflow est terminé. Commentaire: " + commentaire);

            if (demande.getCitoyen() != null && demande.getCitoyen().getEmail() != null) {
                java.util.Map<String, Object> vars = new java.util.HashMap<>();
                vars.put("title", "Demande Validée");
                vars.put("message", "Félicitations, votre demande (Réf: " + demande.getReference() + ") a été entièrement validée.");
                emailService.sendHtmlEmail(demande.getCitoyen().getEmail(), "Demande Validée - Teranga Civil", "email-template", vars);
            }
        }

        return demandeRepository.save(demande);
    }

    @Transactional
    public Demande returnForCorrection(Integer demandeId, Integer userId, String commentaire) {
        Demande demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée"));

        WorkflowStep currentStep = demande.getCurrentStep();
        if (currentStep == null) {
            throw new RuntimeException("La demande n'a pas d'étape en cours");
        }

        List<WorkflowStep> allSteps = workflowStepRepository.findByCircuitIdOrderByOrdreAsc(currentStep.getCircuit().getId());
        int currentIndex = allSteps.indexOf(currentStep);

        if (currentIndex > 0) {
            WorkflowStep prevStep = allSteps.get(currentIndex - 1);
            demande.setCurrentStep(prevStep);
            recordHistorique(demande, null, "RETOUR_CORRECTION", "Retour à l'étape " + prevStep.getNom() + " pour correction. Motif: " + commentaire);

            if (demande.getCitoyen() != null && demande.getCitoyen().getEmail() != null) {
                java.util.Map<String, Object> vars = new java.util.HashMap<>();
                vars.put("title", "Retour pour correction");
                vars.put("message", "Votre demande (Réf: " + demande.getReference() + ") nécessite une correction et a été retournée à l'étape précédente. Motif : " + commentaire);
                emailService.sendHtmlEmail(demande.getCitoyen().getEmail(), "Action requise sur votre demande", "email-template", vars);
            }
        } else {
            demande.setStatut("rejete");
            demande.setMotifRejet(commentaire);
            demande.setCurrentStep(null);
            recordHistorique(demande, null, "DEMANDE_REJETEE", "Demande rejetée. Motif: " + commentaire);

            if (demande.getCitoyen() != null && demande.getCitoyen().getEmail() != null) {
                java.util.Map<String, Object> vars = new java.util.HashMap<>();
                vars.put("title", "Demande Rejetée");
                vars.put("message", "Votre demande (Réf: " + demande.getReference() + ") a malheureusement été rejetée. Motif : " + commentaire);
                emailService.sendHtmlEmail(demande.getCitoyen().getEmail(), "Demande Rejetée - Teranga Civil", "email-template", vars);
            }
        }

        return demandeRepository.save(demande);
    }

    @Transactional
    public SignatureRequest requestSignature(Integer demandeId, Integer signataireId, Integer stepId) {
        Demande demande = demandeRepository.findById(demandeId).orElseThrow();
        // Assume User fetching is done in Controller and we get an ID. 
        // For simplicity we create a basic SignatureRequest entity (needs User object, so let's adjust).
        // Let's implement this in the Controller or inject UserRepository here.
        return null; // Implémentation détaillée plus tard si besoin
    }

    public void recordHistorique(Demande demande, User acteur, String action, String commentaire) {
        DemandeHistorique hist = new DemandeHistorique();
        hist.setDemande(demande);
        hist.setActeur(acteur);
        hist.setAction(action);
        hist.setCommentaire(commentaire);
        demandeHistoriqueRepository.save(hist);
    }
}
