package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.service.ImageClarityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @Autowired
    private ImageClarityService imageClarityService;

    @PostMapping
    public ResponseEntity<ApiResponse<?>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Veuillez sélectionner un fichier à uploader."));
        }

        try {
            // Get root upload path
            String uploadPath = new File("uploads").getAbsolutePath();
            File uploadDir = new File(uploadPath);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            }
            String uniqueName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(uploadPath, uniqueName);

            // Copy file to disk
            Files.copy(file.getInputStream(), filePath);

            boolean isImage = file.getContentType() != null && file.getContentType().startsWith("image/");
            boolean isClear = true;
            double clarityScore = 100.0;

            if (isImage) {
                // Read and analyze the file sharpness
                try (var inputStream = Files.newInputStream(filePath)) {
                    ImageClarityService.ClarityResult result = imageClarityService.analyzeClarity(inputStream);
                    isClear = result.isClear();
                    clarityScore = result.getScore();
                }
            }

            Map<String, Object> data = new HashMap<>();
            data.put("url", "/api/uploads/" + uniqueName);
            data.put("filename", uniqueName);
            data.put("isClear", isClear);
            data.put("score", clarityScore);
            data.put("contentType", file.getContentType());

            return ResponseEntity.ok(ApiResponse.success(data));

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(ApiResponse.error("Erreur technique lors de l'enregistrement du fichier: " + e.getMessage()));
        }
    }
}
