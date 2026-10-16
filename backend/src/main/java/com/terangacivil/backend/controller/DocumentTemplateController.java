package com.terangacivil.backend.controller;

import com.terangacivil.backend.model.DocumentTemplate;
import com.terangacivil.backend.model.Activity;
import com.terangacivil.backend.repository.DocumentTemplateRepository;
import com.terangacivil.backend.repository.ActivityRepository;
import com.terangacivil.backend.model.ChampDynamique;
import com.terangacivil.backend.repository.ChampDynamiqueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/document-templates")
public class DocumentTemplateController {

    @Autowired
    private DocumentTemplateRepository documentTemplateRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ChampDynamiqueRepository champDynamiqueRepository;

    private final String UPLOAD_DIR = "uploads/templates/";

    public DocumentTemplateController() {
        File directory = new File(UPLOAD_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }

    @GetMapping
    public ResponseEntity<?> getTemplates(@RequestParam(required = false) Integer activiteId) {
        if (activiteId != null) {
            return ResponseEntity.ok(documentTemplateRepository.findByActiviteId(activiteId));
        }
        return ResponseEntity.ok(documentTemplateRepository.findAll());
    }

    @GetMapping("/variables/{activiteId}")
    public ResponseEntity<?> getVariables(@PathVariable Integer activiteId) {
        List<String> standardVariables = List.of(
            "region", "departement", "commune", "centre", "qr_code", "date"
        );
        
        List<String> dynamicVariables = new java.util.ArrayList<>(standardVariables);
        
        List<ChampDynamique> champs = champDynamiqueRepository.findByActiviteIdAndActifTrueOrderByOrdreAsc(activiteId);
        for (ChampDynamique c : champs) {
            dynamicVariables.add(c.getNomChamp());
        }
        
        return ResponseEntity.ok(dynamicVariables);
    }

    @PostMapping
    public ResponseEntity<?> createTemplate(@RequestBody DocumentTemplate template) {
        if (template.getActivite() == null || template.getActivite().getId() == null) {
            return ResponseEntity.badRequest().body("L'activité est obligatoire");
        }
        Optional<Activity> activity = activityRepository.findById(template.getActivite().getId());
        if (activity.isEmpty()) {
            return ResponseEntity.badRequest().body("Activité non trouvée");
        }
        template.setActivite(activity.get());

        // Si c'est le premier modèle pour cette activité, on le met principal par défaut
        List<DocumentTemplate> existants = documentTemplateRepository.findByActiviteId(activity.get().getId());
        if (existants.isEmpty()) {
            template.setPrincipal(true);
        } else if (Boolean.TRUE.equals(template.getPrincipal())) {
            // S'il est principal, désactiver les autres
            for (DocumentTemplate t : existants) {
                t.setPrincipal(false);
                documentTemplateRepository.save(t);
            }
        }

        DocumentTemplate saved = documentTemplateRepository.save(template);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/principal")
    public ResponseEntity<?> setPrincipal(@PathVariable Integer id) {
        Optional<DocumentTemplate> templateOpt = documentTemplateRepository.findById(id);
        if (templateOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        DocumentTemplate template = templateOpt.get();
        Integer activiteId = template.getActivite().getId();

        List<DocumentTemplate> existants = documentTemplateRepository.findByActiviteId(activiteId);
        for (DocumentTemplate t : existants) {
            t.setPrincipal(t.getId().equals(id));
            documentTemplateRepository.save(t);
        }
        return ResponseEntity.ok(documentTemplateRepository.findById(id).get());
    }

    @PostMapping("/upload-docx")
    public ResponseEntity<?> uploadDocxTemplate(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Fichier vide");
            }
            if (!file.getOriginalFilename().endsWith(".docx")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Seuls les fichiers .docx sont acceptés");
            }

            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename().replaceAll("[^a-zA-Z0-9\\.\\-]", "_");
            Path path = Paths.get(UPLOAD_DIR + fileName);
            Files.write(path, file.getBytes());

            String fileUrl = "/api/uploads/templates/" + fileName;
            return ResponseEntity.ok(fileUrl);
            
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur lors de la sauvegarde du fichier");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable Integer id) {
        Optional<DocumentTemplate> template = documentTemplateRepository.findById(id);
        if (template.isPresent()) {
            documentTemplateRepository.delete(template.get());
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
