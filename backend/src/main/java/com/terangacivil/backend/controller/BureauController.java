package com.terangacivil.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.model.Bureau;
import com.terangacivil.backend.repository.BureauRepository;
import com.terangacivil.backend.repository.ServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bureaux")
public class BureauController {

    @Autowired
    private BureauRepository bureauRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    private Map<String, Object> mapBureau(Bureau b, long servicesCount) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", b.getId());
        m.put("nom", b.getNom());
        m.put("description", b.getDescription());
        m.put("code", b.getCode());
        m.put("icone", b.getIcone());
        m.put("couleur", b.getCouleur());
        m.put("actif", b.getActif());
        m.put("ordre", b.getOrdre());
        m.put("config", b.getConfig());
        m.put("services_count", servicesCount);
        return m;
    }

    private Map<String, Object> mapBureau(Bureau b) {
        return mapBureau(b, serviceRepository.countByBureauIdAndActifTrue(b.getId()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllBureaux() {
        List<Bureau> bureaux = bureauRepository.findByActifTrueOrderByOrdreAsc();
        List<com.terangacivil.backend.model.Service> activeServices = serviceRepository.findByActifTrue();
        
        Map<Integer, Long> serviceCounts = activeServices.stream()
                .filter(s -> s.getBureau() != null)
                .collect(Collectors.groupingBy(s -> s.getBureau().getId(), Collectors.counting()));

        List<Map<String, Object>> mapped = bureaux.stream()
                .map(b -> mapBureau(b, serviceCounts.getOrDefault(b.getId(), 0L)))
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("bureaux", mapped);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllBureauxAdmin() {
        List<Bureau> bureaux = bureauRepository.findAll();
        List<com.terangacivil.backend.model.Service> activeServices = serviceRepository.findByActifTrue();
        
        Map<Integer, Long> serviceCounts = activeServices.stream()
                .filter(s -> s.getBureau() != null)
                .collect(Collectors.groupingBy(s -> s.getBureau().getId(), Collectors.counting()));

        List<Map<String, Object>> mapped = bureaux.stream()
                .map(b -> mapBureau(b, serviceCounts.getOrDefault(b.getId(), 0L)))
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("bureaux", mapped);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBureau(@RequestBody Map<String, Object> body) {
        Bureau bureau = new Bureau();
        bureau.setNom((String) body.get("nom"));
        bureau.setDescription((String) body.get("description"));
        bureau.setCode((String) body.get("code"));
        bureau.setIcone((String) body.getOrDefault("icone", "Building2"));
        bureau.setCouleur((String) body.getOrDefault("couleur", "#10b981"));
        bureau.setActif(body.containsKey("actif") ? (Boolean) body.get("actif") : true);
        bureau.setOrdre(body.containsKey("ordre") ? Integer.parseInt(body.get("ordre").toString()) : 0);

        if (body.containsKey("config")) {
            bureau.setConfig(new ObjectMapper().valueToTree(body.get("config")));
        }

        Bureau saved = bureauRepository.save(bureau);
        Map<String, Object> data = new HashMap<>();
        data.put("bureau", mapBureau(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateBureau(
            @PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        Bureau bureau = bureauRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bureau non trouvé"));

        if (body.containsKey("nom")) bureau.setNom((String) body.get("nom"));
        if (body.containsKey("description")) bureau.setDescription((String) body.get("description"));
        if (body.containsKey("icone")) bureau.setIcone((String) body.get("icone"));
        if (body.containsKey("couleur")) bureau.setCouleur((String) body.get("couleur"));
        if (body.containsKey("actif")) bureau.setActif((Boolean) body.get("actif"));
        if (body.containsKey("ordre")) bureau.setOrdre(Integer.parseInt(body.get("ordre").toString()));
        if (body.containsKey("config")) {
            bureau.setConfig(new ObjectMapper().valueToTree(body.get("config")));
        }

        Bureau saved = bureauRepository.save(bureau);
        Map<String, Object> data = new HashMap<>();
        data.put("bureau", mapBureau(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBureau(@PathVariable("id") Integer id) {
        bureauRepository.deleteById(id);
        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Bureau supprimé avec succès.");
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleBureau(
            @PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        Bureau bureau = bureauRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bureau non trouvé"));
        Boolean actif = (Boolean) body.get("actif");
        bureau.setActif(actif != null ? actif : !bureau.getActif());
        Bureau saved = bureauRepository.save(bureau);
        Map<String, Object> data = new HashMap<>();
        data.put("bureau", mapBureau(saved));
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
