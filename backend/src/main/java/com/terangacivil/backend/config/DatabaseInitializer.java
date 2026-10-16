package com.terangacivil.backend.config;

import com.terangacivil.backend.model.Permission;
import com.terangacivil.backend.model.Profil;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.PermissionRepository;
import com.terangacivil.backend.repository.ProfilRepository;
import com.terangacivil.backend.repository.RegionRepository;
import com.terangacivil.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    @Autowired
    private RegionRepository regionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private ProfilRepository profilRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Check if database needs seeding
        if (regionRepository.count() == 0) {
            // Try multiple locations for the seed file to support different deployment contexts
            String[] candidatePaths = {
                "../database/seeds.sql",   // when running from backend/ directory
                "database/seeds.sql",      // when running from project root
                "../seed.sql",             // fallback to root seed.sql
                "seed.sql"                 // fallback
            };
            File file = null;
            for (String candidatePath : candidatePaths) {
                File candidate = Paths.get(candidatePath).toAbsolutePath().normalize().toFile();
                if (candidate.exists()) {
                    file = candidate;
                    break;
                }
            }
            if (file != null) {
                System.out.println("Seeding database using: " + file.getAbsolutePath());
                ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new FileSystemResource(file));
                populator.execute(jdbcTemplate.getDataSource());
                System.out.println("Database seeded successfully.");
            } else {
                System.out.println("Info: No seed file found. Please run seed.sql manually if needed.");
            }
        }

        // Initialize Permissions
        String[] permissionNames = {"GERER_GLOBAL", "GERER_REGION", "GERER_DEPARTEMENT", "GERER_COMMUNE", "GERER_CENTRE", "GERER_BUREAU", "GERER_SERVICES", "GERER_ACTIVITES", "GERER_ARCHIVE"};
        for (String permName : permissionNames) {
            if (permissionRepository.findByNom(permName).isEmpty()) {
                Permission p = new Permission();
                p.setNom(permName);
                p.setDescription("Permission: " + permName);
                permissionRepository.save(p);
            }
        }

        // Initialize Profiles
        Profil superAdminProfil = profilRepository.findByNom("Super Admin").orElseGet(() -> {
            Profil p = new Profil();
            p.setNom("Super Admin");
            p.setDescription("Profil avec accès total au système.");
            p.setPermissions(new java.util.HashSet<>(permissionRepository.findAll()));
            return profilRepository.save(p);
        });

        profilRepository.findByNom("Citoyen").orElseGet(() -> {
            Profil p = new Profil();
            p.setNom("Citoyen");
            p.setDescription("Utilisateur de l'application mobile.");
            return profilRepository.save(p);
        });

        profilRepository.findByNom("Agent Archiviste").orElseGet(() -> {
            Profil p = new Profil();
            p.setNom("Agent Archiviste");
            p.setDescription("Utilisateur gérant les archives des dossiers traités et terminés du centre.");
            permissionRepository.findByNom("GERER_ARCHIVE").ifPresent(perm -> {
                java.util.Set<Permission> perms = new java.util.HashSet<>();
                perms.add(perm);
                p.setPermissions(perms);
            });
            return profilRepository.save(p);
        });

        // Check if we need to insert a default Super Admin
        if (userRepository.findByTelephone("+221770000000").isEmpty()) {
            System.out.println("Creating default Super Admin account...");
            User admin = new User();
            admin.setNomComplet("Super Admin");
            admin.setTelephone("+221770000000");
            admin.setEmail("admin@teranga.sn");
            admin.setPasswordHash(passwordEncoder.encode("securepassword"));
            admin.setProfil(superAdminProfil);
            admin.setActif(true);
            userRepository.save(admin);
            System.out.println("Default Super Admin created: Phone: +221770000000 / Password: securepassword");
        }

        // Enrich activity fields for dynamic forms and PDF rendering
        try {
            System.out.println("Enriching activites fields in database...");
            jdbcTemplate.update("UPDATE activites SET champs_requis = '[\"Région\", \"Département\", \"Commune\", \"Centre d''état civil\", \"Sexe\", \"Prénom\", \"Nom de famille\", \"Date de naissance\", \"Lieu de naissance\", \"Prénom du père\", \"Prénom de la mère\", \"Nom de famille de la mère\", \"Année de déclaration\", \"Numéro d''acte\"]' WHERE nom = 'Acte de naissance'");
            jdbcTemplate.update("UPDATE activites SET champs_requis = '[\"Région\", \"Département\", \"Commune\", \"Centre d''état civil\", \"Prénom Époux\", \"Nom Époux\", \"CNI Époux\", \"Prénom Épouse\", \"Nom Épouse\", \"CNI Épouse\", \"Date du mariage\", \"Lieu du mariage\", \"Numéro de registre\"]' WHERE nom = 'Acte de mariage'");
            System.out.println("Activites fields enriched successfully.");
        } catch (Exception e) {
            System.err.println("Error enriching activites fields: " + e.getMessage());
        }
    }
}
