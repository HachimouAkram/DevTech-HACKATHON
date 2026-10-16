package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.*;
import com.terangacivil.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES')")
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUsers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "permission", required = false) String permission,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("users", userService.getUsers(search, role, permission, page, size))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserById(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.getUserById(id))));
    }

    @GetMapping("/metadata")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMetadata() {
        return ResponseEntity.ok(ApiResponse.success(userService.getMetadata()));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES')")
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createUser(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.createUser(request))));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateMyProfile(@RequestBody UserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.updateMyProfile(request))));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateMyPassword(@RequestBody Map<String, String> request) {
        userService.updateMyPassword(request.get("currentPassword"), request.get("newPassword"));
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Mot de passe mis à jour avec succès")));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(
            @PathVariable("id") Integer id,
            @Valid @RequestBody UserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.updateUser(id, request))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(
            @PathVariable("id") Integer id,
            @RequestParam(value = "password", required = false) String password) {
        userService.deleteUser(id, password);
        return ResponseEntity.ok(ApiResponse.success("Votre compte et toutes vos données ont été supprimés avec succès."));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> activateUser(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.toggleUserStatus(id, true))));
    }

    @PreAuthorize("hasAuthority('GERER_GLOBAL')")
    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deactivateUser(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.toggleUserStatus(id, false))));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @PathVariable("id") Integer id,
            @RequestBody Map<String, String> body) {
        userService.resetPassword(id, body.get("password"), body.get("old_password"));
        return ResponseEntity.ok(ApiResponse.success("Mot de passe mis à jour avec succès."));
    }

    @PreAuthorize("hasAnyAuthority('GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES')")
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> adminResetPassword(@PathVariable("id") Integer id) {
        String pwd = userService.adminResetPassword(id);
        return ResponseEntity.ok(ApiResponse.success("Mot de passe réinitialisé. (Si l'e-mail n'arrive pas, le nouveau mot de passe est : " + pwd + ")"));
    }

    @PatchMapping("/{id}/signature")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSignature(
            @PathVariable("id") Integer id,
            @RequestBody SignatureRequest request) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.updateSignature(id, request))));
    }

    @PatchMapping("/{id}/avatar")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateAvatar(
            @PathVariable("id") Integer id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("user", userService.updateAvatar(id, body.get("avatar_url")))));
    }
}
