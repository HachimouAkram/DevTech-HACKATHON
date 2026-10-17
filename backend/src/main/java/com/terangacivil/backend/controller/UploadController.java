package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.ApiResponse;
import com.terangacivil.backend.service.ImageClarityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
            // Get canonical upload path (checks uploads or backend/uploads)
            File uploadDir = new File("uploads").getAbsoluteFile();
            if (!uploadDir.exists() && new File("backend/uploads").exists()) {
                uploadDir = new File("backend/uploads").getAbsoluteFile();
            }
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            String uploadPath = uploadDir.getAbsolutePath();

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

    @GetMapping("/download/{filename:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String filename) {
        try {
            Path filePath = resolveUploadFile(filename);
            if (filePath == null || !Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/download/documents/{filename:.+}")
    public ResponseEntity<Resource> downloadDocumentFile(@PathVariable String filename) {
        return downloadFile("documents/" + filename);
    }

    private Path resolveUploadFile(String subpath) {
        File[] baseDirs = new File[] {
            new File("uploads").getAbsoluteFile(),
            new File("backend/uploads").getAbsoluteFile()
        };
        for (File dir : baseDirs) {
            if (dir.exists()) {
                Path p = dir.toPath().resolve(subpath).normalize();
                if (Files.exists(p)) {
                    return p;
                }
            }
        }
        return null;
    }
}
