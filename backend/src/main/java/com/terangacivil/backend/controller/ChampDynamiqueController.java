package com.terangacivil.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.Activity;
import com.terangacivil.backend.model.ChampDynamique;
import com.terangacivil.backend.repository.ActivityRepository;
import com.terangacivil.backend.repository.ChampDynamiqueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/champs-dynamiques")
public class ChampDynamiqueController {

    @Autowired
    private ChampDynamiqueRepository champDynamiqueRepository;

    @Autowired
    private ActivityRepository activityRepository;

    private Map<String, Object> mapChamp(ChampDynamique c) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", c.getId());
        m.put("nom_champ", c.getNomChamp());
        m.put("label", c.getLabel());
        m.put("type_champ", c.getTypeChamp());
        m.put("obligatoire", c.getObligatoire());
        m.put("options", c.getOptions());
        m.put("ordre", c.getOrdre());
        m.put("placeholder", c.getPlaceholder());
        m.put("motif_lie", c.getMotifLie());
        m.put("actif", c.getActif());
        m.put("conditions", c.getConditions());
        if (c.getActivite() != null) {
            m.put("activite_id", c.getActivite().getId());
            m.put("activite_nom", c.getActivite().getNom());
        }
        return m;
    }

    // GET /api/champs-dynamiques?activiteId=X — liste des champs pour une activité
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getChamps(
            @RequestParam(value = "activiteId", required = false) Integer activiteId) {
        List<ChampDynamique> champs;
        if (activiteId != null) {
            champs = champDynamiqueRepository.findByActiviteIdAndActifTrueOrderByOrdreAsc(activiteId);
        } else {
            champs = champDynamiqueRepository.findAll();
        }
        List<Map<String, Object>> mapped = champs.stream().map(this::mapChamp).collect(Collectors.toList());
        Map<String, Object> data = new HashMap<>();
        data.put("champs", mapped);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // POST /api/champs-dynamiques — créer un champ
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createChamp(@RequestBody Map<String, Object> body) {
        Integer activiteId = Integer.parseInt(body.get("activite_id").toString());
        Activity activite = activityRepository.findById(activiteId)
                .orElseThrow(() -> new IllegalArgumentException("Activité non trouvée"));

        ChampDynamique champ = new ChampDynamique();
        champ.setActivite(activite);
        champ.setNomChamp((String) body.get("nom_champ"));
        champ.setLabel((String) body.get("label"));
        champ.setTypeChamp((String) body.getOrDefault("type_champ", "text"));
        champ.setObligatoire(body.containsKey("obligatoire") ? (Boolean) body.get("obligatoire") : true);
        champ.setOrdre(body.containsKey("ordre") ? Integer.parseInt(body.get("ordre").toString()) : 0);
        champ.setPlaceholder((String) body.get("placeholder"));
        if (body.containsKey("motif_lie")) {
            Object motif = body.get("motif_lie");
            champ.setMotifLie(motif == null ? null : motif.toString());
        }
        champ.setActif(true);
        if (body.containsKey("options")) {
            champ.setOptions(new ObjectMapper().valueToTree(body.get("options")));
        }
        if (body.containsKey("conditions")) {
            champ.setConditions(new ObjectMapper().valueToTree(body.get("conditions")));
        }

        ChampDynamique saved = champDynamiqueRepository.save(champ);
        Map<String, Object> data = new HashMap<>();
        data.put("champ", mapChamp(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // PUT /api/champs-dynamiques/{id} — modifier un champ
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateChamp(
            @PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        ChampDynamique champ = champDynamiqueRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Champ non trouvé"));

        if (body.containsKey("label")) champ.setLabel((String) body.get("label"));
        if (body.containsKey("type_champ")) champ.setTypeChamp((String) body.get("type_champ"));
        if (body.containsKey("obligatoire")) champ.setObligatoire((Boolean) body.get("obligatoire"));
        if (body.containsKey("ordre")) champ.setOrdre(Integer.parseInt(body.get("ordre").toString()));
        if (body.containsKey("placeholder")) champ.setPlaceholder((String) body.get("placeholder"));
        if (body.containsKey("motif_lie")) {
            Object motif = body.get("motif_lie");
            champ.setMotifLie(motif == null ? null : motif.toString());
        }
        if (body.containsKey("actif")) champ.setActif((Boolean) body.get("actif"));
        if (body.containsKey("options")) {
            champ.setOptions(new ObjectMapper().valueToTree(body.get("options")));
        }
        if (body.containsKey("conditions")) {
            champ.setConditions(new ObjectMapper().valueToTree(body.get("conditions")));
        }

        ChampDynamique saved = champDynamiqueRepository.save(champ);
        Map<String, Object> data = new HashMap<>();
        data.put("champ", mapChamp(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // DELETE /api/champs-dynamiques/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteChamp(@PathVariable("id") Integer id) {
        champDynamiqueRepository.deleteById(id);
        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Champ supprimé avec succès.");
        return ResponseEntity.ok(response);
    }

    // PUT /api/champs-dynamiques/activite/{activiteId}/reorder — réordonner les champs
    @PutMapping("/activite/{activiteId}/reorder")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> reorderChamps(
            @PathVariable("activiteId") Integer activiteId,
            @RequestBody List<Map<String, Object>> orderedList) {
        for (Map<String, Object> item : orderedList) {
            Integer champId = Integer.parseInt(item.get("id").toString());
            Integer ordre = Integer.parseInt(item.get("ordre").toString());
            champDynamiqueRepository.findById(champId).ifPresent(c -> {
                c.setOrdre(ordre);
                champDynamiqueRepository.save(c);
            });
        }
        List<Map<String, Object>> champs = champDynamiqueRepository
                .findByActiviteIdAndActifTrueOrderByOrdreAsc(activiteId)
                .stream().map(this::mapChamp).collect(Collectors.toList());
        Map<String, Object> data = new HashMap<>();
        data.put("champs", champs);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
