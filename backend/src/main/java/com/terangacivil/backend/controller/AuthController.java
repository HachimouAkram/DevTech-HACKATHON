package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.*;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.ProfilRepository;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.security.JwtTokenProvider;
import com.terangacivil.backend.security.UserDetailsImpl;
import jakarta.validation.Valid;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfilRepository profilRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private com.terangacivil.backend.service.EmailService emailService;

    // A simple in-memory cache for verification codes. In production, use Redis or DB with expiration.
    private static final java.util.concurrent.ConcurrentHashMap<String, String> verificationCodes = new java.util.concurrent.ConcurrentHashMap<>();

    private void addJwtCookie(HttpServletResponse response, String jwt) {
        Cookie cookie = new Cookie("jwt", jwt);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60); // 1 day
        // cookie.setSecure(true); // Uncomment in prod with HTTPS
        response.addCookie(cookie);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logoutUser(HttpServletResponse response) {
        Cookie cookie = new Cookie("jwt", null);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        ApiResponse<Void> res = new ApiResponse<>();
        res.setStatus("success");
        res.setMessage("Déconnexion réussie");
        return ResponseEntity.ok(res);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        String identifier = loginRequest.getIdentifier().trim();
        
        // 1. Try finding by telephone or email directly
        java.util.Optional<User> userOpt = userRepository.findByTelephone(identifier)
                .or(() -> userRepository.findByEmail(identifier));
                
        // 2. If not found, and it starts with "+221", try searching without it
        if (userOpt.isEmpty() && identifier.startsWith("+221")) {
            String withoutPrefix = identifier.substring(4);
            userOpt = userRepository.findByTelephone(withoutPrefix);
        }
        
        // 3. If not found, and it does not start with "+221" but consists only of digits, try with prefix "+221"
        if (userOpt.isEmpty() && !identifier.startsWith("+221") && identifier.matches("\\d+")) {
            String withPrefix = "+221" + identifier;
            userOpt = userRepository.findByTelephone(withPrefix);
        }
        
        User user = userOpt.orElseThrow(() -> new IllegalArgumentException("Identifiants incorrects."));

        if (Boolean.FALSE.equals(user.getActif())) {
            throw new IllegalArgumentException("Votre compte a été désactivé. Veuillez contacter l'administrateur.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getTelephone(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String roleName = user.getProfil() != null ? user.getProfil().getNom() : "Citoyen";
        String jwt = tokenProvider.generateToken(authentication, user.getId(), roleName);

        // Update last login
        user.setLastLogin(java.time.LocalDateTime.now());
        userRepository.save(user);

        addJwtCookie(response, jwt);

        Map<String, Object> data = new HashMap<>();
        data.put("user", new UserResponse(user));

        return ResponseEntity.ok(ApiResponse.success(jwt, data));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerUser(@Valid @RequestBody RegisterRequest registerRequest, HttpServletResponse response) {
        String expectedCode = verificationCodes.get(registerRequest.getTelephone());
        if (expectedCode == null || !expectedCode.equals(registerRequest.getCode())) {
            // For testing/demo purposes, we can still allow "326532"
            if (!"326532".equals(registerRequest.getCode())) {
                throw new IllegalArgumentException("Le code de vérification est incorrect ou a expiré.");
            }
        } else {
            verificationCodes.remove(registerRequest.getTelephone());
        }

        if (userRepository.findByTelephone(registerRequest.getTelephone()).isPresent()) {
            throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé.");
        }

        if (registerRequest.getEmail() != null && !registerRequest.getEmail().isBlank()) {
            if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Cet e-mail est déjà utilisé.");
            }
        }

        User user = new User();
        user.setNomComplet(registerRequest.getNomComplet());
        user.setTelephone(registerRequest.getTelephone());
        user.setEmail(registerRequest.getEmail());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        user.setProfil(profilRepository.findByNom("Citoyen").orElse(null));
        user.setActif(true);

        User savedUser = userRepository.save(user);

        String roleName = savedUser.getProfil() != null ? savedUser.getProfil().getNom() : "Citoyen";
        String jwt = tokenProvider.generateToken(savedUser.getTelephone(), savedUser.getId(), roleName);

        addJwtCookie(response, jwt);

        Map<String, Object> data = new HashMap<>();
        data.put("user", new UserResponse(savedUser));

        return ResponseEntity.ok(ApiResponse.success(jwt, data));
    }

    @PostMapping("/send-verification")
    public ResponseEntity<ApiResponse<Void>> sendVerification(@RequestBody Map<String, String> request) {
        String telephone = request.get("telephone");
        String email = request.get("email");
        
        if (telephone == null || telephone.isBlank()) {
            throw new IllegalArgumentException("Le numéro de téléphone est requis.");
        }
        
        String code = String.format("%06d", new java.util.Random().nextInt(999999));
        verificationCodes.put(telephone, code);
        
        if (email != null && !email.isBlank()) {
            Map<String, Object> emailVars = new HashMap<>();
            emailVars.put("title", "Code de vérification SenInnov");
            emailVars.put("message", "Votre code de vérification est : <b>" + code + "</b><br>Ce code est valable pour la création de votre compte.");
            new Thread(() -> {
                try {
                    emailService.sendHtmlEmail(email, "Votre code de vérification", "email-template", emailVars);
                } catch (Exception e) {
                    System.err.println("Failed to send verification email asynchronously: " + e.getMessage());
                }
            }).start();
        }
        
        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Code de vérification envoyé avec succès.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-sms")
    public ResponseEntity<ApiResponse<Void>> verifySms(@Valid @RequestBody VerifySmsRequest request) {
        // In dev mode, we accept code '326532'
        if (!"326532".equals(request.getCode())) {
            throw new IllegalArgumentException("Le code de validation saisi est incorrect.");
        }

        User user = userRepository.findByTelephone(request.getTelephone())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé."));

        // User is verified, we can make sure they are active
        user.setActif(true);
        userRepository.save(user);

        ApiResponse<Void> response = new ApiResponse<>();
        response.setStatus("success");
        response.setMessage("Numéro vérifié avec succès.");
        return ResponseEntity.ok(response);
    }
}
