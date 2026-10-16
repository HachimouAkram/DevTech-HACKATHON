package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.*;
import com.terangacivil.backend.model.Permission;
import com.terangacivil.backend.model.Profil;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.PermissionRepository;
import com.terangacivil.backend.repository.ProfilRepository;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ProfilController {

    @Autowired
    private ProfilRepository profilRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            String tel = ((UserDetailsImpl) principal).getUsername();
            return userRepository.findByTelephone(tel).orElse(null);
        }
        return null;
    }

    private boolean hasAccess() {
        User user = getCurrentUser();
        return user != null && user.hasPermission("GERER_GLOBAL");
    }

    @GetMapping("/permissions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllPermissions() {
        if (!hasAccess()) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }
        List<PermissionDTO> perms = permissionRepository.findAll().stream()
                .map(PermissionDTO::new)
                .collect(Collectors.toList());
        Map<String, Object> data = new HashMap<>();
        data.put("permissions", perms);
        return ResponseEntity.ok(ApiResponse.success("Liste des permissions", data));
    }

    @GetMapping("/profils")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllProfils() {
        User user = getCurrentUser();
        if (user == null) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }
        
        List<ProfilResponse> profils = profilRepository.findAll().stream()
                .map(ProfilResponse::new)
                .collect(Collectors.toList());
        Map<String, Object> data = new HashMap<>();
        data.put("profils", profils);
        return ResponseEntity.ok(ApiResponse.success("Liste des profils", data));
    }

    @PostMapping("/profils")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createProfil(@Valid @RequestBody ProfilRequest request) {
        if (!hasAccess()) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }
        if (profilRepository.findByNom(request.getNom()).isPresent()) {
            throw new IllegalArgumentException("Un profil avec ce nom existe déjà.");
        }

        Profil profil = new Profil();
        profil.setNom(request.getNom());
        profil.setDescription(request.getDescription());
        
        Set<Permission> perms = new HashSet<>();
        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            perms.addAll(permissionRepository.findAllById(request.getPermissionIds()));
        }
        profil.setPermissions(perms);
        
        profil = profilRepository.save(profil);

        Map<String, Object> data = new HashMap<>();
        data.put("profil", new ProfilResponse(profil));
        return ResponseEntity.ok(ApiResponse.success("Profil créé avec succès", data));
    }

    @PutMapping("/profils/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfil(@PathVariable Integer id, @Valid @RequestBody ProfilRequest request) {
        if (!hasAccess()) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }

        Profil profil = profilRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Profil non trouvé."));

        // Empêcher la modification du nom des profils systèmes si nécessaire
        if (profil.getNom().equals("Super Admin") || profil.getNom().equals("Citoyen")) {
            if (!profil.getNom().equals(request.getNom())) {
                throw new IllegalArgumentException("Le nom des profils systèmes ne peut pas être modifié.");
            }
        }

        Optional<Profil> existing = profilRepository.findByNom(request.getNom());
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalArgumentException("Un autre profil avec ce nom existe déjà.");
        }

        profil.setNom(request.getNom());
        profil.setDescription(request.getDescription());
        
        Set<Permission> perms = new HashSet<>();
        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            perms.addAll(permissionRepository.findAllById(request.getPermissionIds()));
        }
        profil.setPermissions(perms);
        
        profil = profilRepository.save(profil);

        Map<String, Object> data = new HashMap<>();
        data.put("profil", new ProfilResponse(profil));
        return ResponseEntity.ok(ApiResponse.success("Profil mis à jour avec succès", data));
    }

    @DeleteMapping("/profils/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProfil(@PathVariable Integer id) {
        if (!hasAccess()) {
            throw new IllegalArgumentException("Accès non autorisé.");
        }
        Profil profil = profilRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Profil non trouvé."));

        if (profil.getNom().equals("Super Admin") || profil.getNom().equals("Citoyen")) {
            throw new IllegalArgumentException("Impossible de supprimer les profils systèmes.");
        }

        // TODO: Validate that no users are currently using this profile
        // For now, we will just delete or let JPA throw constraint violation
        try {
            profilRepository.delete(profil);
        } catch (Exception e) {
            throw new IllegalArgumentException("Impossible de supprimer ce profil car il est utilisé par des utilisateurs.");
        }

        ApiResponse<Void> res = new ApiResponse<>();
        res.setStatus("success");
        res.setMessage("Profil supprimé avec succès.");
        return ResponseEntity.ok(res);
    }
}
