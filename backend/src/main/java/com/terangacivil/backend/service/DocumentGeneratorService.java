package com.terangacivil.backend.service;

import com.deepoove.poi.XWPFTemplate;
import com.deepoove.poi.data.Pictures;
import com.deepoove.poi.data.PictureType;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.terangacivil.backend.model.Demande;
import com.terangacivil.backend.model.DocumentTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.Font;
import java.awt.FontMetrics;
import javax.imageio.ImageIO;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentGeneratorService {

    private final String UPLOAD_DIR = "uploads/documents/";

    @Autowired
    private PdfGenerationService pdfGenerationService;

    public DocumentGeneratorService() {
        File directory = new File(UPLOAD_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }

    public String generateDocument(Demande demande, DocumentTemplate template, com.terangacivil.backend.model.User currentUser) throws Exception {
        if ("HTML".equalsIgnoreCase(template.getType())) {
            return generateHtmlPdf(demande, template, currentUser);
        } else if ("DOCX".equalsIgnoreCase(template.getType())) {
            return generateDocx(demande, template, currentUser);
        } else {
            throw new IllegalArgumentException("Type de modèle non supporté : " + template.getType());
        }
    }

    private String generateHtmlPdf(Demande demande, DocumentTemplate template, com.terangacivil.backend.model.User currentUser) throws Exception {
        String htmlContent = template.getContentHtml();
        Map<String, Object> dataMap = extractData(demande, currentUser);

        // Replace placeholders {{var}}
        for (Map.Entry<String, Object> entry : dataMap.entrySet()) {
            // Ignore PictureRenderData used for DOCX
            if (entry.getValue() != null && entry.getValue().getClass().getName().contains("PictureRenderData")) continue;
            
            String placeholder = "\\{\\{" + entry.getKey().replace(".", "\\.") + "\\}\\}";
            String value = entry.getValue() != null ? entry.getValue().toString() : "";
            htmlContent = htmlContent.replaceAll(placeholder, value);
        }

        // Replace qr_code
        if (htmlContent.contains("{{qr_code}}")) {
            String qrContent = buildQrCodeContent(demande, dataMap, currentUser);
            String base64Image = generateQrCodeBase64(qrContent);
            String imgTag = "<img src=\"data:image/png;base64," + base64Image + "\" "
                          + "style=\"width:100px; height:100px; max-width:100%; display:inline-block;\" alt=\"QR Code\"/>";
            htmlContent = htmlContent.replace("{{qr_code}}", imgTag);
        }

        // Replace signatures and cachets — always combined into ONE right-aligned block to avoid overflow/page-break issues
        if (currentUser != null) {
            boolean hasSignaturePlaceholder = htmlContent.contains("{{officier.signature}}");
            boolean hasCachetPlaceholder   = htmlContent.contains("{{officier.cachet}}");

            String signatureBase64 = "";
            String cachetBase64    = "";

            if (hasSignaturePlaceholder && currentUser.getSignatureUrl() != null) {
                String signaturePath = "uploads/" + currentUser.getSignatureUrl()
                    .substring(currentUser.getSignatureUrl().lastIndexOf("/") + 1);
                signatureBase64 = encodeFileToBase64(signaturePath);
            }

            if (hasCachetPlaceholder && currentUser.getCachetUrl() != null) {
                String cachetPath = "uploads/" + currentUser.getCachetUrl()
                    .substring(currentUser.getCachetUrl().lastIndexOf("/") + 1);
                cachetBase64 = encodeFileToBase64(cachetPath);
            }

            if (hasSignaturePlaceholder) {
                StringBuilder officierBlock = new StringBuilder();
                // Single right-aligned, page-break-proof container for the entire officier section
                officierBlock.append("<div style=\"")
                    .append("display:table;")                          // table prevents float collapse
                    .append("float:right;")                            // always on the right
                    .append("page-break-inside:avoid !important;")
                    .append("break-inside:avoid !important;")
                    .append("text-align:center;")
                    .append("max-width:210px;")
                    .append("margin-left:20px;")
                    .append("margin-top:4px;")
                    .append("\">");

                // Officier name at the top of the block
                String officierNom = currentUser.getNomComplet() != null ? currentUser.getNomComplet() : "";
                if (!officierNom.isEmpty()) {
                    officierBlock.append("<div style=\"")
                        .append("font-weight:bold;")
                        .append("font-size:10pt;")
                        .append("margin-bottom:4px;")
                        .append("color:#000;")
                        .append("\">")
                        .append(officierNom)
                        .append("</div>");
                }

                // Signature image
                if (!signatureBase64.isEmpty()) {
                    officierBlock.append("<img src=\"data:image/png;base64,").append(signatureBase64).append("\" ")
                        .append("style=\"")
                        .append("width:110px;")
                        .append("max-width:100%;")
                        .append("height:auto;")
                        .append("display:block;")
                        .append("margin:0 auto 4px auto;")
                        .append("\" alt=\"Signature\"/>");
                }

                // Cachet image immediately below — same block, no page break possible
                if (!cachetBase64.isEmpty()) {
                    officierBlock.append("<img src=\"data:image/png;base64,").append(cachetBase64).append("\" ")
                        .append("style=\"")
                        .append("width:90px;")
                        .append("max-width:100%;")
                        .append("height:auto;")
                        .append("display:block;")
                        .append("margin:0 auto;")
                        .append("\" alt=\"Cachet\"/>");
                }

                officierBlock.append("</div>");
                // Clear float so content below is not affected
                officierBlock.append("<div style=\"clear:both;\"></div>");

                // Put the combined block at {{officier.signature}} position
                htmlContent = htmlContent.replace("{{officier.signature}}", officierBlock.toString());

                // Erase the separate cachet placeholder (already included in the combined block above)
                if (hasCachetPlaceholder) {
                    htmlContent = htmlContent.replace("{{officier.cachet}}", "");
                }

                // Erase any remaining standalone {{officier.nom_complet}} near the signature
                // (the name is now shown inside the combined block)
                htmlContent = htmlContent.replace("{{officier.nom_complet}}", "");

            } else if (hasCachetPlaceholder) {
                // No signature placeholder — render cachet standalone on the right
                if (!cachetBase64.isEmpty()) {
                    String cachetBlock = "<div style=\""
                        + "display:table;float:right;page-break-inside:avoid !important;"
                        + "break-inside:avoid !important;text-align:center;max-width:160px;margin-left:20px;\">"
                        + "<img src=\"data:image/png;base64," + cachetBase64 + "\" "
                        + "style=\"width:90px;max-width:100%;height:auto;display:block;margin:0 auto;\" alt=\"Cachet\"/>"
                        + "</div>"
                        + "<div style=\"clear:both;\"></div>";
                    htmlContent = htmlContent.replace("{{officier.cachet}}", cachetBlock);
                } else {
                    htmlContent = htmlContent.replace("{{officier.cachet}}", "");
                }
            }
        }

        // Basic HTML structure if missing — inject comprehensive print/PDF CSS
        if (!htmlContent.contains("<html>")) {
            htmlContent = "<html><head><style>"
                        + "  @page { margin: 20mm 15mm 25mm 15mm; }"
                        + "  body { font-family: 'Helvetica', Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #222; }"
                        + "  img { max-width: 100%; height: auto; page-break-inside: avoid; }"
                        + "  .officier-block { float:right; page-break-inside:avoid !important; break-inside:avoid !important; text-align:center; max-width:210px; }"
                        + "  .signature-block, .footer-block, .pied-de-page {"
                        + "    page-break-inside: avoid !important;"
                        + "    break-inside: avoid !important;"
                        + "    display: block;"
                        + "    overflow: hidden;"
                        + "  }"
                        + "  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }"
                        + "  tr { page-break-inside: avoid; page-break-after: auto; }"
                        + "</style></head><body>"
                        + htmlContent + "</body></html>";
        } else {
            // If the template already has <html>, inject our safety CSS into the <head>
            String safetyStyle = "<style>"
                + "  img { max-width: 100% !important; height: auto !important; }"
                + "  .officier-block { float:right !important; page-break-inside:avoid !important; break-inside:avoid !important; text-align:center; max-width:210px; }"
                + "  .signature-block, .footer-block, .pied-de-page {"
                + "    page-break-inside: avoid !important; break-inside: avoid !important;"
                + "  }"
                + "</style>";
            htmlContent = htmlContent.replace("</head>", safetyStyle + "</head>");
        }

        // Replace HTML entities like &nbsp; with XML-compatible equivalents (&#160;) to avoid SAXParseException
        htmlContent = htmlContent.replace("&nbsp;", "&#160;");

        String fileName = "doc_" + demande.getReference() + ".pdf";
        Path outputPath = Paths.get(UPLOAD_DIR + fileName);

        boolean renderedSuccessfully = false;
        try {
            try (OutputStream os = new FileOutputStream(outputPath.toFile())) {
                PdfRendererBuilder builder = new PdfRendererBuilder();
                builder.useFastMode();
                builder.withHtmlContent(htmlContent, "file:///");
                builder.toStream(os);
                builder.run();
            }
            if (Files.exists(outputPath) && Files.size(outputPath) > 0) {
                renderedSuccessfully = true;
            } else {
                System.err.println("OpenHtmlToPdf produced 0-byte file, will fall back to OpenPDF.");
            }
        } catch (Exception e) {
            System.err.println("OpenHtmlToPdf failed (" + e.getMessage() + "), falling back to OpenPDF...");
        }

        if (!renderedSuccessfully) {
            try {
                byte[] pdfBytes = pdfGenerationService.generateCertificatePdf(demande);
                Files.write(outputPath, pdfBytes);
                System.out.println("Fallback PDF generated successfully with OpenPDF (" + pdfBytes.length + " bytes)");
            } catch (Exception ex) {
                System.err.println("OpenPDF fallback also failed: " + ex.getMessage());
                ex.printStackTrace();
                throw new RuntimeException("Erreur lors de la génération du PDF: " + ex.getMessage(), ex);
            }
        }

        return "/api/uploads/documents/" + fileName;
    }

    private String generateDocx(Demande demande, DocumentTemplate template, com.terangacivil.backend.model.User currentUser) throws Exception {
        if (template.getFichierDocxUrl() == null || template.getFichierDocxUrl().isEmpty()) {
            throw new IllegalArgumentException("Le modèle DOCX ne contient pas de fichier attaché.");
        }

        // Extract filename from URL (e.g., /api/uploads/templates/file.docx)
        String templateFileName = template.getFichierDocxUrl().substring(template.getFichierDocxUrl().lastIndexOf("/") + 1);
        Path templatePath = Paths.get("uploads/templates/" + templateFileName);

        if (!Files.exists(templatePath)) {
            throw new IllegalArgumentException("Le fichier modèle introuvable : " + templatePath.toString());
        }

        Map<String, Object> dataMap = extractData(demande, currentUser);
        
        // Add QR Code for poi-tl (tag should be {{@qr_code}})
        String qrContent = buildQrCodeContent(demande, dataMap, currentUser);
        byte[] qrBytes = generateQrCodeBytes(qrContent);
        if (qrBytes != null) {
            dataMap.put("qr_code", Pictures.ofStream(new java.io.ByteArrayInputStream(qrBytes), PictureType.PNG).size(150, 150).create());
        }

        // Add Signature and Cachet for poi-tl
        if (currentUser != null) {
            File sigFile = null;
            File cachetFile = null;

            if (currentUser.getSignatureUrl() != null) {
                String signaturePath = "uploads/" + currentUser.getSignatureUrl().substring(currentUser.getSignatureUrl().lastIndexOf("/") + 1);
                sigFile = new File(signaturePath);
            }
            if (currentUser.getCachetUrl() != null) {
                String cachetPath = "uploads/" + currentUser.getCachetUrl().substring(currentUser.getCachetUrl().lastIndexOf("/") + 1);
                cachetFile = new File(cachetPath);
            }

            byte[] combinedSig = createCombinedSignatureImage(currentUser.getNomComplet(), sigFile, cachetFile);
            if (combinedSig != null) {
                dataMap.put("officier.signature", Pictures.ofStream(new java.io.ByteArrayInputStream(combinedSig), PictureType.PNG).size(250, 200).create());
            } else {
                dataMap.put("officier.signature", "");
            }
            
            // Empty the cachet placeholder so it doesn't double-render if present in the DOCX template
            dataMap.put("officier.cachet", "");
        }
        // Convert flat map to nested map for poi-tl
        Map<String, Object> nestedMap = new HashMap<>();
        for (Map.Entry<String, Object> entry : dataMap.entrySet()) {
            String[] parts = entry.getKey().split("\\.");
            if (parts.length == 1) {
                nestedMap.put(parts[0], entry.getValue());
            } else if (parts.length == 2) {
                Map<String, Object> parentMap = (Map<String, Object>) nestedMap.computeIfAbsent(parts[0], k -> new HashMap<>());
                parentMap.put(parts[1], entry.getValue());
            }
        }

        String outputFileName = "doc_" + demande.getReference() + ".pdf";
        Path outputPath = Paths.get(UPLOAD_DIR + outputFileName);

        // Generate docx with poi-tl
        com.deepoove.poi.config.ConfigureBuilder configBuilder = com.deepoove.poi.config.Configure.builder()
                .bind("qr_code", new com.deepoove.poi.policy.PictureRenderPolicy());

        if (dataMap.get("officier.signature") instanceof com.deepoove.poi.data.PictureRenderData) {
            configBuilder.bind("officier.signature", new com.deepoove.poi.policy.PictureRenderPolicy());
        }
        if (dataMap.get("officier.cachet") instanceof com.deepoove.poi.data.PictureRenderData) {
            configBuilder.bind("officier.cachet", new com.deepoove.poi.policy.PictureRenderPolicy());
        }
        com.deepoove.poi.config.Configure config = configBuilder.build();

        XWPFTemplate docxTemplate = XWPFTemplate.compile(templatePath.toFile(), config).render(nestedMap);
        
        // Convert to PDF using docx4j
        java.io.ByteArrayOutputStream tempDocx = new java.io.ByteArrayOutputStream();
        docxTemplate.write(tempDocx);
        docxTemplate.close();

        try {
            java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(tempDocx.toByteArray());
            org.docx4j.openpackaging.packages.WordprocessingMLPackage wordMLPackage = 
                org.docx4j.openpackaging.packages.WordprocessingMLPackage.load(bis);

            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(outputPath.toFile())) {
                org.docx4j.Docx4J.toPDF(wordMLPackage, fos);
            }
            return "/api/uploads/documents/" + outputFileName;
        } catch (Exception e) {
            System.err.println("DOCX to PDF conversion failed, falling back to DOCX: " + e.getMessage());
            e.printStackTrace();
            String fallbackFileName = "doc_" + demande.getReference() + ".docx";
            Path fallbackPath = Paths.get(UPLOAD_DIR + fallbackFileName);
            try (FileOutputStream out = new FileOutputStream(fallbackPath.toFile())) {
                out.write(tempDocx.toByteArray());
            }
            return "/api/uploads/documents/" + fallbackFileName;
        }
    }

    private Map<String, Object> extractData(Demande demande, com.terangacivil.backend.model.User currentUser) {
        Map<String, Object> dataMap = new HashMap<>();

        // Citoyen data
        if (demande.getCitoyen() != null) {
            dataMap.put("citoyen.nom_complet", demande.getCitoyen().getNomComplet());
            dataMap.put("citoyen.email", demande.getCitoyen().getEmail());
            dataMap.put("citoyen.telephone", demande.getCitoyen().getTelephone());
        }

        // Demande data
        dataMap.put("demande.reference", demande.getReference());
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        dataMap.put("demande.date", demande.getDateSoumission().format(formatter));

        DateTimeFormatter actFormatter = DateTimeFormatter.ofPattern("'le' dd MMMM yyyy", java.util.Locale.FRANCE);
        dataMap.put("demande.date_actuelle", java.time.LocalDate.now().format(actFormatter));

        dataMap.put("demande.annee", demande.getAnnee() != null ? demande.getAnnee().toString() : "");
        dataMap.put("demande.numero", demande.getNumero() != null ? demande.getNumero().toString() : "");

        if (demande.getCentre() != null) {
            dataMap.put("demande.centre", demande.getCentre().getNom());
            if (demande.getCentre().getCommune() != null) {
                dataMap.put("demande.commune", demande.getCentre().getCommune().getNom());
                if (demande.getCentre().getCommune().getDepartement() != null) {
                    dataMap.put("demande.departement", demande.getCentre().getCommune().getDepartement().getNom());
                    if (demande.getCentre().getCommune().getDepartement().getRegion() != null) {
                        dataMap.put("demande.region", demande.getCentre().getCommune().getDepartement().getRegion().getNom());
                    }
                }
            }
        }
        
        if (demande.getCentreDelivrance() != null) {
            dataMap.put("demande.centre_delivrance", demande.getCentreDelivrance().getNom());
        }
        
        if (demande.getActivite() != null) {
            dataMap.put("activite.nom", demande.getActivite().getNom());
        }

        // Dynamic Form data
        JsonNode donnees = demande.getDonnees();
        if (donnees != null && donnees.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = donnees.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                dataMap.put(field.getKey(), field.getValue().asText());
                // Keep the old prefix just in case the template uses it
                dataMap.put("formulaire." + field.getKey(), field.getValue().asText());
            }
        }
        
        // Officier data
        if (currentUser != null) {
            dataMap.put("officier.nom_complet", currentUser.getNomComplet());
            dataMap.put("officier.grade", currentUser.getProfil() != null ? currentUser.getProfil().getNom() : "");
        }

        return dataMap;
    }

    private String buildQrCodeContent(Demande demande, Map<String, Object> dataMap, com.terangacivil.backend.model.User currentUser) {
        StringBuilder sb = new StringBuilder();
        sb.append("République du Sénégal\n");
        sb.append("Un Peuple - Un But - Une Foi\n\n");
        sb.append("Document: ").append(demande.getActivite() != null ? demande.getActivite().getNom() : "N/A").append("\n");
        sb.append("Réf: ").append(demande.getReference()).append("\n");
        sb.append("Délivré le: ").append(dataMap.get("demande.date_actuelle")).append("\n");
        
        String commune = dataMap.containsKey("demande.commune") ? (String) dataMap.get("demande.commune") : "N/A";
        String centre = dataMap.containsKey("demande.centre") ? (String) dataMap.get("demande.centre") : "N/A";
        sb.append("Commune: ").append(commune).append("\n");
        sb.append("Centre: ").append(centre).append("\n");
        
        sb.append("-----------------\n");
        sb.append("Informations Citoyen:\n");
        
        JsonNode donnees = demande.getDonnees();
        if (donnees != null && donnees.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = donnees.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String key = field.getKey().toLowerCase();
                // Afficher uniquement le nom et prenom de l'utilisateur, exclure la date de naissance
                if (key.contains("nom") || key.contains("prenom") || key.contains("prénom")) {
                    sb.append("- ").append(field.getKey()).append(": ").append(field.getValue().asText()).append("\n");
                }
            }
        }
        return sb.toString();
    }

    private byte[] generateQrCodeBytes(String text) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, 200, 200);
            
            int width = bitMatrix.getWidth();
            int height = bitMatrix.getHeight();
            BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2d = image.createGraphics();
            
            // Use darker versions of the colors to ensure high contrast for the scanner
            Color green = new Color(0, 90, 40);      // Dark Green
            Color yellow = new Color(160, 140, 0);   // Dark Gold / Olive
            Color red = new Color(170, 15, 20);      // Dark Red
            
            float[] fractions = {0.0f, 0.5f, 1.0f};
            Color[] colors = {green, yellow, red};
            java.awt.LinearGradientPaint paint = new java.awt.LinearGradientPaint(0, 0, width, height, fractions, colors);
            g2d.setPaint(paint);
            g2d.fillRect(0, 0, width, height);
            g2d.dispose();
            
            for (int x = 0; x < width; x++) {
                for (int y = 0; y < height; y++) {
                    if (!bitMatrix.get(x, y)) {
                        image.setRGB(x, y, 0xFFFFFFFF);
                    }
                }
            }
            
            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", pngOutputStream);
            return pngOutputStream.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private String generateQrCodeBase64(String text) {
        try {
            byte[] pngData = generateQrCodeBytes(text);
            if (pngData != null) {
                return java.util.Base64.getEncoder().encodeToString(pngData);
            }
            return "";
        } catch (Exception e) {
            e.printStackTrace();
            return "";
        }
    }

    private String encodeFileToBase64(String filePath) {
        try {
            File file = new File(filePath);
            if (file.exists()) {
                byte[] bytes = Files.readAllBytes(file.toPath());
                return Base64.getEncoder().encodeToString(bytes);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "";
    }

    private byte[] createCombinedSignatureImage(String name, File signatureFile, File cachetFile) {
        try {
            BufferedImage sigImage = signatureFile != null && signatureFile.exists() ? ImageIO.read(signatureFile) : null;
            BufferedImage cachetImage = cachetFile != null && cachetFile.exists() ? ImageIO.read(cachetFile) : null;
            
            int width = 250;
            int currentY = 10;
            
            int totalHeight = 20; 
            if (name != null && !name.isEmpty()) totalHeight += 30; 
            if (sigImage != null) {
                int h = (sigImage.getHeight() * 200) / sigImage.getWidth();
                totalHeight += h + 10;
            }
            if (cachetImage != null) {
                int h = (cachetImage.getHeight() * 150) / cachetImage.getWidth();
                totalHeight += h + 10;
            }
            
            if (totalHeight == 20) return null; 
            
            BufferedImage combined = new BufferedImage(width, totalHeight, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2d = combined.createGraphics();
            
            if (name != null && !name.isEmpty()) {
                g2d.setColor(Color.BLACK);
                g2d.setFont(new Font("SansSerif", Font.BOLD, 14));
                FontMetrics fm = g2d.getFontMetrics();
                int x = (width - fm.stringWidth(name)) / 2;
                g2d.drawString(name, x, currentY + fm.getAscent());
                currentY += 30;
            }
            
            if (sigImage != null) {
                int w = 200;
                int h = (sigImage.getHeight() * 200) / sigImage.getWidth();
                int x = (width - w) / 2;
                g2d.drawImage(sigImage, x, currentY, w, h, null);
                currentY += h + 10;
            }
            
            if (cachetImage != null) {
                int w = 150;
                int h = (cachetImage.getHeight() * 150) / cachetImage.getWidth();
                int x = (width - w) / 2;
                g2d.drawImage(cachetImage, x, currentY, w, h, null);
            }
            
            g2d.dispose();
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(combined, "PNG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
