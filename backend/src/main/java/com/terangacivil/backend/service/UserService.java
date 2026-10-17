package com.terangacivil.backend.service;

import com.terangacivil.backend.dto.*;
import com.terangacivil.backend.exception.ResourceNotFoundException;
import com.terangacivil.backend.exception.UnauthorizedActionException;
import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import com.terangacivil.backend.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
public class UserService {

    private static final List<String> HIERARCHY = Arrays.asList(
        "GERER_GLOBAL", "GERER_REGION", "GERER_DEPARTEMENT", "GERER_COMMUNE", 
        "GERER_CENTRE", "GERER_BUREAU", "GERER_SERVICES", "GERER_ACTIVITES"
    );

    @Autowired private UserRepository userRepository;
    @Autowired private RegionRepository regionRepository;
    @Autowired private DepartementRepository departementRepository;
    @Autowired private CommuneRepository communeRepository;
    @Autowired private CentreRepository centreRepository;
    @Autowired private ServiceRepository serviceRepository;
    @Autowired private BureauRepository bureauRepository;
    @Autowired private ProfilRepository profilRepository;
    @Autowired private ActivityRepository activityRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailService emailService;
    @Autowired private UserDetailsServiceImpl userDetailsService;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private SseService sseService;

    public int getLevelIndex(User user) {
        if (user.getProfil() == null || user.getProfil().getPermissions() == null) return HIERARCHY.size();
        return user.getProfil().getPermissions().stream()
                .map(p -> HIERARCHY.indexOf(p.getNom()))
                .filter(i -> i != -1)
                .min(Integer::compareTo)
                .orElse(HIERARCHY.size());
    }

    public int getLevelIndex(Profil profil) {
        if (profil == null || profil.getPermissions() == null) return HIERARCHY.size();
        return profil.getPermissions().stream()
                .map(p -> HIERARCHY.indexOf(p.getNom()))
                .filter(i -> i != -1)
                .min(Integer::compareTo)
                .orElse(HIERARCHY.size());
    }

    public Page<UserResponse> getUsers(String search, String role, String permission, int page, int size) {
        User currentUser = currentUserService.getCurrentUser();
        Specification<User> spec = UserSpecifications.filterUsers(currentUser, search, role, permission);
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return userRepository.findAll(spec, pageable).map(UserResponse::new);
    }

    public UserResponse getUserById(Integer id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        return new UserResponse(user);
    }

    public Map<String, Object> getMetadata() {
        User currentUser = currentUserService.getCurrentUser();
        List<Map<String, Object>> regions = regionRepository.findAll().stream().map(r -> {
            Map<String, Object> m = new HashMap<>(); m.put("id", r.getId()); m.put("nom", r.getNom()); m.put("code", r.getCode()); return m;
        }).collect(Collectors.toList());

        List<Map<String, Object>> depts = departementRepository.findAll().stream().map(d -> {
            Map<String, Object> m = new HashMap<>(); m.put("id", d.getId()); m.put("nom", d.getNom()); m.put("code", d.getCode()); m.put("region_id", d.getRegion().getId()); return m;
        }).collect(Collectors.toList());

        List<Map<String, Object>> communes = communeRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new HashMap<>(); m.put("id", c.getId()); m.put("nom", c.getNom()); m.put("code", c.getCode());
            if (c.getDepartement() != null) { m.put("departement_id", c.getDepartement().getId()); m.put("departement_nom", c.getDepartement().getNom());
                if (c.getDepartement().getRegion() != null) { m.put("region_id", c.getDepartement().getRegion().getId()); m.put("region_nom", c.getDepartement().getRegion().getNom()); }
            } return m;
        }).collect(Collectors.toList());

        List<Map<String, Object>> centres = centreRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new HashMap<>(); m.put("id", c.getId()); m.put("nom", c.getNom()); m.put("code", c.getCode());
            if (c.getCommune() != null) { m.put("commune_id", c.getCommune().getId()); m.put("commune_nom", c.getCommune().getNom());
                if (c.getCommune().getDepartement() != null) { m.put("departement_id", c.getCommune().getDepartement().getId()); m.put("departement_nom", c.getCommune().getDepartement().getNom());
                    if (c.getCommune().getDepartement().getRegion() != null) { m.put("region_id", c.getCommune().getDepartement().getRegion().getId()); m.put("region_nom", c.getCommune().getDepartement().getRegion().getNom()); }
                }
            } return m;
        }).collect(Collectors.toList());

        List<Service> allServices;
        if (currentUser.hasPermission("GERER_BUREAU")) { allServices = List.copyOf(currentUser.getServices()); } 
        else if (currentUser.hasPermission("GERER_COMMUNE")) {
            if (currentUser.getBureau() != null) { allServices = serviceRepository.findByBureauId(currentUser.getBureau().getId()); } 
            else { allServices = List.of(); }
        } else { allServices = serviceRepository.findAll(); }

        List<Map<String, Object>> services = allServices.stream().map(s -> {
            Map<String, Object> m = new HashMap<>(); m.put("id", s.getId()); m.put("nom", s.getNom()); m.put("description", s.getDescription()); m.put("icone", s.getIcone()); m.put("actif", s.getActif()); m.put("config", s.getConfig());
            if (s.getBureau() != null) { m.put("bureau_id", s.getBureau().getId()); m.put("bureau_nom", s.getBureau().getNom()); } return m;
        }).collect(Collectors.toList());

        List<Map<String, Object>> bureaux = bureauRepository.findAll().stream().map(b -> {
            Map<String, Object> m = new HashMap<>(); m.put("id", b.getId()); m.put("nom", b.getNom()); m.put("code", b.getCode()); return m;
        }).collect(Collectors.toList());

        return Map.of("regions", regions, "departements", depts, "communes", communes, "centres", centres, "services", services, "bureaux", bureaux);
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        User currentUser = currentUserService.getCurrentUser();

        if (userRepository.findByTelephone(request.getTelephone()).isPresent()) {
            throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé.");
        }
        if (request.getEmail() != null && !request.getEmail().isBlank() && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Cet e-mail est déjà utilisé.");
        }

        String plainPassword = request.getPassword();
        boolean passwordGenerated = false;

        if (plainPassword == null || plainPassword.isBlank()) {
            plainPassword = org.apache.commons.lang3.RandomStringUtils.randomAlphanumeric(8);
            passwordGenerated = true;
        } else if (plainPassword.length() < 6) {
            throw new IllegalArgumentException("Le mot de passe doit comporter au moins 6 caractères.");
        }

        User newUser = new User();
        newUser.setNomComplet(request.getNomComplet());
        newUser.setTelephone(request.getTelephone());
        newUser.setEmail(request.getEmail());
        newUser.setPasswordHash(passwordEncoder.encode(plainPassword));
        if (passwordGenerated) newUser.setMustChangePassword(true);
        
        Profil profil = profilRepository.findByNom(request.getRole()).orElseThrow(() -> new ResourceNotFoundException("Profil introuvable"));
        newUser.setProfil(profil);
        newUser.setActif(true);

        int creatorLevel = getLevelIndex(currentUser);
        int newProfileLevel = getLevelIndex(profil);

        if (creatorLevel == HIERARCHY.size()) throw new UnauthorizedActionException("Vous n'êtes pas autorisé à créer des utilisateurs.");

        if (creatorLevel == HIERARCHY.indexOf("GERER_GLOBAL")) {
            if (newProfileLevel < HIERARCHY.indexOf("GERER_GLOBAL") || newProfileLevel > HIERARCHY.indexOf("GERER_COMMUNE")) {
                throw new UnauthorizedActionException("Le Super Admin crée uniquement les profils de responsables territoriaux (jusqu'au maire).");
            }
        } else if (creatorLevel == HIERARCHY.indexOf("GERER_COMMUNE")) {
            if (newProfileLevel <= HIERARCHY.indexOf("GERER_COMMUNE")) {
                throw new UnauthorizedActionException("Le Maire ne peut créer que des profils de son centre (Officiers, Agents, Archivistes).");
            }
        } else if (creatorLevel > HIERARCHY.indexOf("GERER_COMMUNE")) {
            throw new UnauthorizedActionException("Les Officiers et Agents n'ont pas le droit de créer des utilisateurs.");
        } else {
            if (newProfileLevel <= creatorLevel || newProfileLevel > HIERARCHY.indexOf("GERER_COMMUNE")) {
                throw new UnauthorizedActionException("Vous ne pouvez créer que des responsables territoriaux sous votre autorité.");
            }
        }

        if (creatorLevel >= HIERARCHY.indexOf("GERER_REGION") && currentUser.getRegionsGerees() != null) {
            newUser.setRegionsGerees(new HashSet<>(currentUser.getRegionsGerees()));
        } else if (request.getRegionIds() != null && !request.getRegionIds().isEmpty()) {
            newUser.setRegionsGerees(new HashSet<>(regionRepository.findAllById(request.getRegionIds())));
        }

        if (creatorLevel >= HIERARCHY.indexOf("GERER_DEPARTEMENT") && currentUser.getDepartementsGeres() != null) {
            newUser.setDepartementsGeres(new HashSet<>(currentUser.getDepartementsGeres()));
        } else if (request.getDepartementIds() != null && !request.getDepartementIds().isEmpty()) {
            newUser.setDepartementsGeres(new HashSet<>(departementRepository.findAllById(request.getDepartementIds())));
        }

        if (creatorLevel >= HIERARCHY.indexOf("GERER_COMMUNE") && currentUser.getCommune() != null) {
            newUser.setCommune(currentUser.getCommune());
        } else if (request.getCommuneId() != null) {
            newUser.setCommune(communeRepository.findById(request.getCommuneId()).orElseThrow(() -> new ResourceNotFoundException("Commune non trouvée")));
        }

        if (creatorLevel >= HIERARCHY.indexOf("GERER_CENTRE") && currentUser.getCentre() != null) {
            newUser.setCentre(currentUser.getCentre());
        } else if (request.getCentreId() != null) {
            newUser.setCentre(centreRepository.findById(request.getCentreId()).orElseThrow(() -> new ResourceNotFoundException("Centre non trouvé")));
        }

        if (creatorLevel >= HIERARCHY.indexOf("GERER_BUREAU") && currentUser.getBureau() != null) {
            newUser.setBureau(currentUser.getBureau());
        } else if (request.getBureauId() != null) {
            newUser.setBureau(bureauRepository.findById(request.getBureauId()).orElseThrow(() -> new ResourceNotFoundException("Bureau non trouvé")));
        }

        if (creatorLevel >= HIERARCHY.indexOf("GERER_SERVICES") && currentUser.getServices() != null) {
            newUser.setServices(new HashSet<>(currentUser.getServices()));
            newUser.setServiceId(currentUser.getServiceId());
        } else if (request.getServiceIds() != null && !request.getServiceIds().isEmpty()) {
            List<Service> services = serviceRepository.findAllById(request.getServiceIds());
            newUser.setServices(new HashSet<>(services));
            if (!services.isEmpty()) newUser.setServiceId(services.get(0).getId());
        }

        if (request.getActivityIds() != null && !request.getActivityIds().isEmpty()) {
            newUser.setActivities(new HashSet<>(activityRepository.findAllById(request.getActivityIds())));
        }

        User savedUser = userRepository.save(newUser);

        if (passwordGenerated && savedUser.getEmail() != null && !savedUser.getEmail().isBlank()) {
            String tempPwd = plainPassword;
            new Thread(() -> {
                try {
                    Map<String, Object> emailVars = new HashMap<>();
                    emailVars.put("title", "Création de votre compte SenInnov");
                    emailVars.put("message", "Un compte d'accès vous a été créé par un administrateur.<br>Votre mot de passe provisoire est : <b>" + tempPwd + "</b><br>Vous devrez le modifier lors de votre première connexion.");
                    emailService.sendHtmlEmail(savedUser.getEmail(), "Création de compte", "email-template", emailVars);
                } catch (Exception e) {
                    System.err.println("Failed to send welcome email asynchronously: " + e.getMessage());
                }
            }).start();
        }
        return new UserResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUser(Integer id, UserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User currentUser = currentUserService.getCurrentUser();
        
        if (!currentUser.hasPermission("GERER_GLOBAL") && !currentUser.hasPermission("GERER_REGION") && !currentUser.hasPermission("GERER_DEPARTEMENT")) {
            if (currentUser.hasPermission("GERER_COMMUNE")) {
                if (currentUser.getCommune() != null) {
                    if (user.getCommune() == null || !user.getCommune().getId().equals(currentUser.getCommune().getId())) {
                        throw new UnauthorizedActionException("Vous ne pouvez pas modifier un utilisateur d'une autre commune.");
                    }
                }
            }
        }

        userRepository.findByTelephone(request.getTelephone()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé.");
        });

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) throw new IllegalArgumentException("Cet e-mail est déjà utilisé.");
            });
        }

        user.setNomComplet(request.getNomComplet());
        user.setTelephone(request.getTelephone());
        user.setEmail(request.getEmail());
        if (request.getLieuNaissance() != null) {
            user.setLieuNaissance(request.getLieuNaissance().isBlank() ? null : request.getLieuNaissance().trim());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            if (request.getPassword().length() < 6) throw new IllegalArgumentException("Le mot de passe doit comporter au moins 6 caractères.");
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (currentUser.hasPermission("GERER_GLOBAL")) {
            if (request.getBureauId() != null) user.setBureau(bureauRepository.findById(request.getBureauId()).orElse(null));
            if (request.getCommuneId() != null) user.setCommune(communeRepository.findById(request.getCommuneId()).orElse(null));
            if (request.getCentreId() != null) user.setCentre(centreRepository.findById(request.getCentreId()).orElse(null));
        } else if (currentUser.hasPermission("GERER_COMMUNE")) {
            if (request.getCentreId() != null) user.setCentre(centreRepository.findById(request.getCentreId()).orElse(null));
        }

        int currentLevel = getLevelIndex(currentUser);

        if (request.getServiceIds() != null) {
            List<Service> services = serviceRepository.findAllById(request.getServiceIds());
            if (currentLevel == HIERARCHY.indexOf("GERER_BUREAU")) {
                for (Service s : services) {
                    if (currentUser.getServices() != null && currentUser.getServices().stream().noneMatch(srv -> srv.getId().equals(s.getId()))) {
                        throw new UnauthorizedActionException("Vous ne pouvez assigner que vos propres services.");
                    }
                }
            } else {
                for (Service s : services) {
                    if (s.getBureau() == null || (user.getBureau() != null && !s.getBureau().getId().equals(user.getBureau().getId()))) {
                        throw new IllegalArgumentException("Le service " + s.getNom() + " n'appartient pas au bureau de l'utilisateur.");
                    }
                }
            }
            user.setServices(new HashSet<>(services));
            if (!services.isEmpty()) user.setServiceId(services.get(0).getId());
        }
        
        boolean isAgent = user.getProfil() != null && !user.hasPermission("GERER_GLOBAL") && !user.hasPermission("GERER_REGION") && 
                          !user.hasPermission("GERER_DEPARTEMENT") && !user.hasPermission("GERER_COMMUNE") && 
                          !user.hasPermission("GERER_CENTRE") && !user.hasPermission("GERER_BUREAU") && !user.hasPermission("GERER_SERVICES");

        if (isAgent || request.getActivityIds() != null) {
            if (request.getActivityIds() != null) {
                List<Activity> activities = activityRepository.findAllById(request.getActivityIds());
                if (currentLevel == HIERARCHY.indexOf("GERER_BUREAU")) {
                    for (Activity act : activities) {
                        boolean belongsToOfficerService = currentUser.getServices() != null && currentUser.getServices().stream()
                                .anyMatch(s -> s.getId().equals(act.getService().getId()));
                        if (!belongsToOfficerService) throw new UnauthorizedActionException("L'activité " + act.getNom() + " n'appartient pas à vos services.");
                    }
                } else {
                    Set<Service> userServices = user.getServices();
                    if (userServices != null && !userServices.isEmpty()) {
                        for (Activity act : activities) {
                            boolean belongsToUserService = userServices.stream().anyMatch(s -> s.getId().equals(act.getService().getId()));
                            if (!belongsToUserService) throw new IllegalArgumentException("L'activité n'appartient pas aux services de l'utilisateur.");
                        }
                    }
                }
                user.setActivities(new HashSet<>(activities));
            }
        }

        User savedUser = userRepository.save(user);
        userDetailsService.invalidateCache(savedUser.getTelephone());
        if (savedUser.getEmail() != null) userDetailsService.invalidateCache(savedUser.getEmail());
        
        return new UserResponse(savedUser);
    }

    @Transactional
    public void deleteUser(Integer id, String password) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User currentUser = currentUserService.getCurrentUser();

        if (!currentUser.getId().equals(user.getId()) && !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à supprimer ce compte.");
        }

        if (currentUser.getId().equals(user.getId())) {
            if (password == null || password.isBlank()) throw new IllegalArgumentException("Le mot de passe est requis pour supprimer votre propre compte.");
            if (!passwordEncoder.matches(password, currentUser.getPasswordHash())) throw new IllegalArgumentException("Mot de passe incorrect.");
        }

        jdbcTemplate.update("DELETE FROM rendez_vous WHERE citoyen_id = ? OR demande_id IN (SELECT id FROM demandes WHERE citoyen_id = ?)", id, id);
        jdbcTemplate.update("DELETE FROM demande_historiques WHERE user_id = ? OR demande_id IN (SELECT id FROM demandes WHERE citoyen_id = ?)", id, id);
        jdbcTemplate.update("DELETE FROM signature_requests WHERE signataire_cible_id = ? OR demande_id IN (SELECT id FROM demandes WHERE citoyen_id = ?)", id, id);
        jdbcTemplate.update("DELETE FROM demandes WHERE citoyen_id = ?", id);
        jdbcTemplate.update("DELETE FROM notifications WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM user_communes_gerees WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM user_departements_geres WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM user_regions_gerees WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM user_activities WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM user_services WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM centre_activites WHERE configure_par = ?", id);
        jdbcTemplate.update("DELETE FROM centre_bureaux WHERE configure_par = ?", id);
        jdbcTemplate.update("DELETE FROM centre_services WHERE configure_par = ?", id);
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);

        userDetailsService.invalidateCache(user.getTelephone());
        if (user.getEmail() != null) userDetailsService.invalidateCache(user.getEmail());
    }

    @Transactional
    public UserResponse updateMyProfile(UserRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        User user = userRepository.findById(currentUser.getId()).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (request.getTelephone() != null && !request.getTelephone().isBlank()) {
            userRepository.findByTelephone(request.getTelephone()).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé.");
            });
            user.setTelephone(request.getTelephone());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) throw new IllegalArgumentException("Cet e-mail est déjà utilisé.");
            });
            user.setEmail(request.getEmail());
        }

        if (request.getNomComplet() != null && !request.getNomComplet().isBlank()) user.setNomComplet(request.getNomComplet());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            if (request.getPassword().length() < 6) throw new IllegalArgumentException("Le mot de passe doit comporter au moins 6 caractères.");
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            userDetailsService.invalidateCache(user.getTelephone());
            if (user.getEmail() != null) userDetailsService.invalidateCache(user.getEmail());
        }

        User savedUser = userRepository.save(user);
        return new UserResponse(savedUser);
    }

    @Transactional
    public void updateMyPassword(String currentPassword, String newPassword) {
        User currentUser = currentUserService.getCurrentUser();
        if (currentPassword == null || newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Les mots de passe sont invalides (minimum 6 caractères).");
        }
        if (!passwordEncoder.matches(currentPassword, currentUser.getPasswordHash())) {
            throw new IllegalArgumentException("Le mot de passe actuel est incorrect.");
        }
        currentUser.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(currentUser);
    }

    @Transactional
    public UserResponse toggleUserStatus(Integer id, boolean active) {
        User currentUser = currentUserService.getCurrentUser();
        if (!currentUser.hasPermission("GERER_GLOBAL")) {
            throw new UnauthorizedActionException("Seul le super admin peut activer/désactiver des comptes.");
        }
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        if (user.getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Vous ne pouvez pas désactiver votre propre compte.");
        }
        user.setActif(active);
        return new UserResponse(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(Integer id, String newPassword, String oldPassword) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User currentUser = currentUserService.getCurrentUser();
        
        if (!currentUser.getId().equals(user.getId()) && !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à modifier le mot de passe de cet utilisateur.");
        }

        if (currentUser.getId().equals(user.getId())) {
            if (oldPassword == null || !passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
                throw new IllegalArgumentException("Ancien mot de passe incorrect.");
            }
        }

        if (newPassword == null || newPassword.length() < 6) throw new IllegalArgumentException("Le mot de passe doit comporter au moins 6 caractères.");

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);

        userDetailsService.invalidateCache(user.getTelephone());
        if (user.getEmail() != null) userDetailsService.invalidateCache(user.getEmail());
    }

    @Transactional
    public String adminResetPassword(Integer id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new IllegalArgumentException("Cet utilisateur n'a pas d'adresse e-mail pour recevoir le mot de passe.");
        }
        String randomPassword = org.apache.commons.lang3.RandomStringUtils.randomAlphanumeric(8);
        user.setPasswordHash(passwordEncoder.encode(randomPassword));
        user.setMustChangePassword(true);
        userRepository.save(user);

        userDetailsService.invalidateCache(user.getTelephone());
        userDetailsService.invalidateCache(user.getEmail());

        new Thread(() -> {
            try {
                Map<String, Object> emailVars = new HashMap<>();
                emailVars.put("title", "Réinitialisation de votre mot de passe SenInnov");
                emailVars.put("message", "Votre mot de passe a été réinitialisé par un administrateur.<br>Votre nouveau mot de passe temporaire est : <b>" + randomPassword + "</b><br>Vous devrez le modifier lors de votre prochaine connexion.");
                emailService.sendHtmlEmail(user.getEmail(), "Réinitialisation de mot de passe", "email-template", emailVars);
            } catch (Exception e) {
                System.err.println("Failed to send reset password email asynchronously: " + e.getMessage());
            }
        }).start();

        return randomPassword;
    }

    @Transactional
    public UserResponse updateSignature(Integer id, com.terangacivil.backend.dto.SignatureRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User currentUser = currentUserService.getCurrentUser();
        
        if (!currentUser.getId().equals(user.getId()) && !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à modifier la signature de cet utilisateur.");
        }

        if (request.getCachetUrl() != null) user.setCachetUrl(request.getCachetUrl());
        if (request.getSignatureUrl() != null) user.setSignatureUrl(request.getSignatureUrl());

        return new UserResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateAvatar(Integer id, String avatarUrl) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User currentUser = currentUserService.getCurrentUser();
        
        if (!currentUser.getId().equals(user.getId()) && !currentUser.hasPermission("GERER_GLOBAL")) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à modifier la photo de profil de cet utilisateur.");
        }

        user.setAvatarUrl(avatarUrl);
        User savedUser = userRepository.save(user);

        if (sseService != null) {
            sseService.broadcast("refresh_user_profile", String.valueOf(user.getId()));
        }

        return new UserResponse(savedUser);
    }
}
