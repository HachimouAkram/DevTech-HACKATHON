package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.service.DivisionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/divisions")
public class DivisionController {

    @Autowired
    private DivisionService divisionService;

    // --- REGIONS ---
    @GetMapping("/regions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRegions() {
        Map<String, Object> data = new HashMap<>();
        data.put("regions", divisionService.getAllRegions());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PostMapping("/regions")
    public ResponseEntity<ApiResponse<String>> createRegion(@RequestBody Map<String, String> body) {
        divisionService.createRegion(body.get("nom"), body.get("code"));
        return ResponseEntity.ok(ApiResponse.success("Région créée avec succès."));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PutMapping("/regions/{id}")
    public ResponseEntity<ApiResponse<String>> updateRegion(@PathVariable("id") Integer id, @RequestBody Map<String, String> body) {
        divisionService.updateRegion(id, body.get("nom"), body.get("code"));
        return ResponseEntity.ok(ApiResponse.success("Région modifiée avec succès."));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @DeleteMapping("/regions/{id}")
    public ResponseEntity<ApiResponse<String>> deleteRegion(@PathVariable("id") Integer id) {
        divisionService.deleteRegion(id);
        return ResponseEntity.ok(ApiResponse.success("Région supprimée avec succès."));
    }

    // --- DEPARTEMENTS ---
    @GetMapping("/departements")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDepartements() {
        Map<String, Object> data = new HashMap<>();
        data.put("departements", divisionService.getAllDepartements());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PostMapping("/departements")
    public ResponseEntity<ApiResponse<String>> createDepartement(@RequestBody Map<String, Object> body) {
        Integer regionId = Integer.parseInt(body.get("region_id").toString());
        divisionService.createDepartement((String) body.get("nom"), (String) body.get("code"), regionId);
        return ResponseEntity.ok(ApiResponse.success("Département créé avec succès."));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PutMapping("/departements/{id}")
    public ResponseEntity<ApiResponse<String>> updateDepartement(@PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        Integer regionId = Integer.parseInt(body.get("region_id").toString());
        divisionService.updateDepartement(id, (String) body.get("nom"), (String) body.get("code"), regionId);
        return ResponseEntity.ok(ApiResponse.success("Département modifié avec succès."));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @DeleteMapping("/departements/{id}")
    public ResponseEntity<ApiResponse<String>> deleteDepartement(@PathVariable("id") Integer id) {
        divisionService.deleteDepartement(id);
        return ResponseEntity.ok(ApiResponse.success("Département supprimé avec succès."));
    }

    // --- COMMUNES ---
    @GetMapping("/communes")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCommunes() {
        Map<String, Object> data = new HashMap<>();
        data.put("communes", divisionService.getAllCommunes());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PostMapping("/communes")
    public ResponseEntity<ApiResponse<String>> createCommune(@RequestBody Map<String, Object> body) {
        Double lat = body.get("latitude") != null ? Double.parseDouble(body.get("latitude").toString()) : null;
        Double lng = body.get("longitude") != null ? Double.parseDouble(body.get("longitude").toString()) : null;
        Integer deptId = Integer.parseInt(body.get("departement_id").toString());
        
        divisionService.createCommune((String) body.get("nom"), (String) body.get("code"), lat, lng, deptId);
        return ResponseEntity.ok(ApiResponse.success("Commune créée avec succès."));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PutMapping("/communes/{id}")
    public ResponseEntity<ApiResponse<String>> updateCommune(@PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        Double lat = body.get("latitude") != null ? Double.parseDouble(body.get("latitude").toString()) : null;
        Double lng = body.get("longitude") != null ? Double.parseDouble(body.get("longitude").toString()) : null;
        Integer deptId = Integer.parseInt(body.get("departement_id").toString());

        divisionService.updateCommune(id, (String) body.get("nom"), (String) body.get("code"), lat, lng, deptId);
        return ResponseEntity.ok(ApiResponse.success("Commune modifiée avec succès."));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @DeleteMapping("/communes/{id}")
    public ResponseEntity<ApiResponse<String>> deleteCommune(@PathVariable("id") Integer id) {
        divisionService.deleteCommune(id);
        return ResponseEntity.ok(ApiResponse.success("Commune supprimée avec succès."));
    }

    // --- CENTRES ---
    @GetMapping("/centres")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCentres(
            @RequestParam(required = false, defaultValue = "false") boolean isPublic) {
        Map<String, Object> data = new HashMap<>();
        data.put("centres", divisionService.getAllCentres(isPublic));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE')")
    @PostMapping("/centres")
    public ResponseEntity<ApiResponse<String>> createCentre(@RequestBody Map<String, Object> body) {
        Double lat = body.get("latitude") != null ? Double.parseDouble(body.get("latitude").toString()) : null;
        Double lng = body.get("longitude") != null ? Double.parseDouble(body.get("longitude").toString()) : null;
        Integer communeId = Integer.parseInt(body.get("commune_id").toString());

        divisionService.createCentre((String) body.get("nom"), (String) body.get("code"), lat, lng, communeId);
        return ResponseEntity.ok(ApiResponse.success("Centre créé avec succès."));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE')")
    @PutMapping("/centres/{id}")
    public ResponseEntity<ApiResponse<String>> updateCentre(@PathVariable("id") Integer id, @RequestBody Map<String, Object> body) {
        Double lat = body.get("latitude") != null ? Double.parseDouble(body.get("latitude").toString()) : null;
        Double lng = body.get("longitude") != null ? Double.parseDouble(body.get("longitude").toString()) : null;
        Integer communeId = Integer.parseInt(body.get("commune_id").toString());

        divisionService.updateCentre(id, (String) body.get("nom"), (String) body.get("code"), lat, lng, communeId);
        return ResponseEntity.ok(ApiResponse.success("Centre modifié avec succès."));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_COMMUNE')")
    @DeleteMapping("/centres/{id}")
    public ResponseEntity<ApiResponse<String>> deleteCentre(@PathVariable("id") Integer id) {
        divisionService.deleteCentre(id);
        return ResponseEntity.ok(ApiResponse.success("Centre supprimé avec succès."));
    }
}
