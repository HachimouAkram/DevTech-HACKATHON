package com.terangacivil.backend.controller;

import com.terangacivil.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test-email")
public class TestEmailController {

    @Autowired
    private EmailService emailService;

    @GetMapping
    public ResponseEntity<String> sendTestEmail(@RequestParam String to) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("title", "Test de configuration Email");
            vars.put("message", "Ceci est un test pour vérifier que la configuration SMTP fonctionne correctement.");
            
            // Appeler la méthode
            emailService.sendHtmlEmail(to, "Test SMTP - SenInnov", "email-template", vars);
            
            return ResponseEntity.ok("Commande d'envoi déclenchée pour : " + to + ". Vérifiez la console du backend pour voir s'il y a une erreur ou un succès !");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur immédiate : " + e.getMessage());
        }
    }
}
