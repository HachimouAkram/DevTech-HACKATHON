package com.terangacivil.backend.service;

import com.terangacivil.backend.model.Centre;
import com.terangacivil.backend.model.Demande;
import com.terangacivil.backend.model.RendezVous;
import com.terangacivil.backend.repository.CentreRepository;
import com.terangacivil.backend.repository.DemandeRepository;
import com.terangacivil.backend.repository.RendezVousRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RendezVousService {

    @Autowired
    private RendezVousRepository rendezVousRepository;

    @Autowired
    private DemandeRepository demandeRepository;

    @Autowired
    private CentreRepository centreRepository;

    private boolean isJourOuvrable(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
    }

    private List<LocalTime> genererCreneaux(LocalDate date) {
        List<LocalTime> creneaux = new ArrayList<>();
        if (!isJourOuvrable(date)) {
            return creneaux;
        }

        LocalTime matinStart = LocalTime.of(9, 0);
        LocalTime matinEnd = LocalTime.of(13, 30);
        
        LocalTime apresMidiStart = LocalTime.of(15, 0);
        LocalTime apresMidiEnd = LocalTime.of(17, 30);

        LocalTime current = matinStart;
        while (current.isBefore(matinEnd)) {
            creneaux.add(current);
            current = current.plusMinutes(30);
        }

        current = apresMidiStart;
        while (current.isBefore(apresMidiEnd)) {
            creneaux.add(current);
            current = current.plusMinutes(30);
        }

        return creneaux;
    }

    public List<LocalTime> getDisponibilites(Integer centreId, LocalDate date) {
        List<LocalTime> tousLesCreneaux = genererCreneaux(date);
        
        if (tousLesCreneaux.isEmpty()) {
            return tousLesCreneaux;
        }

        List<RendezVous> existants = rendezVousRepository.findByCentreIdAndDate(centreId, date);
        List<LocalTime> creneauxOccuper = existants.stream()
                .filter(rv -> !rv.getStatut().equals("ANNULE") && !rv.getStatut().equals("REPORTE"))
                .map(RendezVous::getHeure)
                .collect(Collectors.toList());

        return tousLesCreneaux.stream()
                .filter(c -> !creneauxOccuper.contains(c))
                .collect(Collectors.toList());
    }

    public RendezVous reserver(Integer demandeId, Integer centreId, LocalDate date, LocalTime heure) {
        if (!isJourOuvrable(date)) {
            throw new IllegalArgumentException("La date choisie n'est pas un jour ouvrable.");
        }

        Demande demande = demandeRepository.findById(demandeId)
                .orElseThrow(() -> new IllegalArgumentException("Demande non trouvée"));
                
        Centre centre = centreRepository.findById(centreId)
                .orElseThrow(() -> new IllegalArgumentException("Centre non trouvé"));

        boolean isOccupe = rendezVousRepository.existsByCentreIdAndDateAndHeureAndStatutNot(centreId, date, heure, "ANNULE");
        if (isOccupe) {
            throw new IllegalArgumentException("Ce créneau est déjà réservé.");
        }

        RendezVous rv = new RendezVous();
        rv.setNumeroRendezVous("RDV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        rv.setDemande(demande);
        rv.setCitoyen(demande.getCitoyen());
        rv.setCentre(centre);
        rv.setDate(date);
        rv.setHeure(heure);
        rv.setStatut("CONFIRME");

        return rendezVousRepository.save(rv);
    }

    @org.springframework.transaction.annotation.Transactional
    public RendezVous changerStatut(Integer rendezVousId, String nouveauStatut) {
        RendezVous rv = rendezVousRepository.findById(rendezVousId)
                .orElseThrow(() -> new IllegalArgumentException("Rendez-vous non trouvé"));

        rv.setStatut(nouveauStatut.toUpperCase());
        RendezVous saved = rendezVousRepository.save(rv);

        // Si le RDV est marqué EFFECTUE et que la demande nécessite une présence physique,
        // clôturer automatiquement la demande (le citoyen a remis ses pièces en main propre)
        if ("EFFECTUE".equalsIgnoreCase(nouveauStatut) && saved.getDemande() != null) {
            Demande demande = saved.getDemande();
            Boolean presenceRequise = demande.getActivite() != null
                    ? demande.getActivite().getPresencePhysiqueRequise()
                    : false;
            if (Boolean.TRUE.equals(presenceRequise)) {
                demande.setStatut("valide_cloture");
                demande.setDateValidation(java.time.LocalDateTime.now());
                demandeRepository.save(demande);
            }
        }

        return saved;
    }


    public RendezVous reporter(Integer id, LocalDate nouvelleDate, LocalTime nouvelleHeure) {
        if (!isJourOuvrable(nouvelleDate)) {
            throw new IllegalArgumentException("La date choisie n'est pas un jour ouvrable.");
        }

        RendezVous rv = rendezVousRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rendez-vous non trouvé"));

        Integer centreId = rv.getCentre().getId();

        List<RendezVous> targetRendezVous = rendezVousRepository.findByCentreIdAndDate(centreId, nouvelleDate);
        boolean isOccupe = targetRendezVous.stream()
                .anyMatch(r -> r.getHeure().equals(nouvelleHeure) 
                        && !r.getId().equals(id) 
                        && !r.getStatut().equals("ANNULE"));

        if (isOccupe) {
            throw new IllegalArgumentException("Ce créneau est déjà réservé.");
        }

        rv.setDate(nouvelleDate);
        rv.setHeure(nouvelleHeure);
        rv.setStatut("REPORTE");

        return rendezVousRepository.save(rv);
    }
}
