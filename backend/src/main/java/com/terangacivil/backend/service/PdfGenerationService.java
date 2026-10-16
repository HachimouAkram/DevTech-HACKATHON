package com.terangacivil.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.terangacivil.backend.model.Demande;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

@Service
public class PdfGenerationService {

    public byte[] generateCertificatePdf(Demande demande) throws IOException, DocumentException {
        String activityNom = (demande.getActivite() != null) ? demande.getActivite().getNom() : "";
        boolean isNaissance = activityNom.toLowerCase().contains("naissance");

        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        if (isNaissance) {
            generateBirthCertificate(document, demande);
        } else {
            generateMarriageCertificate(document, demande);
        }

        document.close();
        return out.toByteArray();
    }

    private void generateBirthCertificate(Document document, Demande demande) throws DocumentException {
        JsonNode data = demande.getDonnees();

        // 1. Header Table (2 columns: left is Region/Department/Commune, right is Republic/Eta-Civil)
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{50, 50});

        // Left Cell
        String region = getField(data, "Région", "KEDOUGOU");
        String dept = getField(data, "Département", "KEDOUGOU");
        String commune = getField(data, "Commune", "DINDEFELO");
        String centre = getField(data, "Centre d'état civil", "DINDEFELO");

        String leftText = "REGION DE " + region.toUpperCase() + "\n" +
                "DEPARTEMENT DE " + dept.toUpperCase() + "\n" +
                "ARRONDISSEMENT DE BANDAFASSI\n" +
                "COMMUNE DE " + commune.toUpperCase();

        PdfPCell leftCell = new PdfPCell(new Paragraph(leftText, FontFactory.getFont(FontFactory.HELVETICA, 10, Font.BOLD)));
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        headerTable.addCell(leftCell);

        // Right Cell
        String rightText = "REPUBLIQUE DU SENEGAL\n" +
                "Un Peuple - Un But - Une Foi\n\n" +
                "ETA-CIVIL\n" +
                "CENTRE DE " + centre.toUpperCase();

        PdfPCell rightCell = new PdfPCell(new Paragraph(rightText, FontFactory.getFont(FontFactory.HELVETICA, 10, Font.BOLD)));
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        headerTable.addCell(rightCell);

        document.add(headerTable);

        // Spacer line
        document.add(new Paragraph("\n"));
        LineSeparator line = new LineSeparator(1.5f, 100, null, Element.ALIGN_CENTER, -2);
        document.add(line);
        document.add(new Paragraph("\n"));

        // 2. Title & Registry Info Box
        PdfPTable infoBox = new PdfPTable(2);
        infoBox.setWidthPercentage(100);
        infoBox.setWidths(new float[]{70, 30});

        String anneeDec = getField(data, "Année de déclaration", "");
        if (anneeDec.isEmpty()) {
            anneeDec = getField(data, "Année", "");
        }
        String numActe = getField(data, "Numéro d'acte", "");
        if (numActe.isEmpty()) {
            numActe = getField(data, "Numéro", "");
        }

        PdfPCell titleCell = new PdfPCell(new Paragraph("EXTRAIT DU REGISTRE DES ACTES DE NAISSANCE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        infoBox.addCell(titleCell);

        PdfPCell regCell = new PdfPCell(new Paragraph("ANNEE: " + anneeDec + "\n\nN° Registre: " + numActe, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        regCell.setBorder(Rectangle.BOX);
        regCell.setPadding(10);
        regCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        infoBox.addCell(regCell);

        document.add(infoBox);
        document.add(new Paragraph("\n\n"));

        // 3. Body Text (Filtration & Dotted Placeholders)
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Font.NORMAL);
        Font boldValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Font.NORMAL);

        String sexe = getField(data, "Sexe", "Masculin");
        String prenom = getField(data, "Prénom", "");
        String nom = getField(data, "Nom de famille", "");
        String dateNaiss = getField(data, "Date de naissance", "");
        String lieuNaiss = getField(data, "Lieu de naissance", "");
        String prenomPere = getField(data, "Prénom du père", "");
        String prenomMere = getField(data, "Prénom de la mère", "");
        String nomMere = getField(data, "Nom de famille de la mère", "");

        // Build Paragraphs
        document.add(createDottedLineParagraph("Sur l'année deux mille : ", anneeDec, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("Dans le registre : ", "NAISSANCES", labelFont, boldValueFont));
        document.add(createDottedLineParagraph("Est né(e) le : ", dateNaiss, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("À : ", lieuNaiss, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("Enfant de sexe : ", sexe + " (M ou F)", labelFont, boldValueFont));
        document.add(createDottedLineParagraph("PRENOM : ", prenom, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("NOM DE FAMILLE : ", nom, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("de (Prénom du père) : ", prenomPere, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("et de (Prénom de la mère) : ", prenomMere, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("Nom de famille de la mère : ", nomMere, labelFont, boldValueFont));

        document.add(new Paragraph("\n\n"));

        // 4. Bottom / Signatures
        PdfPTable bottomTable = new PdfPTable(2);
        bottomTable.setWidthPercentage(100);
        bottomTable.setWidths(new float[]{50, 50});

        PdfPCell bLeft = new PdfPCell(new Paragraph("Extrait délivré par le\n" +
                "TRIBUNAL D'INSTANCE DE " + region.toUpperCase() + "\n\n" +
                "Sous le numéro: " + demande.getReference(), labelFont));
        bLeft.setBorder(Rectangle.BOX);
        bLeft.setPadding(8);
        bottomTable.addCell(bLeft);

        String dateValStr = demande.getDateValidation() != null
                ? demande.getDateValidation().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "";
        String officierNom = demande.getOfficier() != null ? demande.getOfficier().getNomComplet() : "Officier d'État Civil";

        PdfPCell bRight = new PdfPCell();
        bRight.setBorder(Rectangle.NO_BORDER);
        bRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        Paragraph pInfo = new Paragraph("Fait le: " + dateValStr + "\n\nSigné par l'Officier:\n" + officierNom + "\n\n", labelFont);
        pInfo.setAlignment(Element.ALIGN_RIGHT);
        bRight.addElement(pInfo);
        
        addSignatureAndCachetToCell(bRight, demande.getOfficier());
        
        bottomTable.addCell(bRight);

        document.add(bottomTable);
        document.add(new Paragraph("\n\n"));

        // 5. NIN Generator footer
        String nin = generateNin(sexe, anneeDec, centre, demande.getId());

        PdfPTable ninTable = new PdfPTable(1);
        ninTable.setWidthPercentage(100);
        PdfPCell ninCell = new PdfPCell(new Paragraph("NUMERO CARTE NATIONALE D'IDENTITE (NIN / CNI) :\n\n" + nin, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
        ninCell.setBorder(Rectangle.BOX);
        ninCell.setPadding(10);
        ninCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        ninTable.addCell(ninCell);
        document.add(ninTable);
    }

    private void generateMarriageCertificate(Document document, Demande demande) throws DocumentException {
        JsonNode data = demande.getDonnees();

        // 1. Header Table
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{50, 50});

        String region = getField(data, "Région", "DK");
        String dept = getField(data, "Département", "Dakar");
        String commune = getField(data, "Commune", "Dakar Plateau");
        String centre = getField(data, "Centre d'état civil", "Centre Principal de Dakar Plateau");

        String leftText = "REGION DE " + region.toUpperCase() + "\n" +
                "DEPARTEMENT DE " + dept.toUpperCase() + "\n" +
                "COMMUNE DE " + commune.toUpperCase();

        PdfPCell leftCell = new PdfPCell(new Paragraph(leftText, FontFactory.getFont(FontFactory.HELVETICA, 10, Font.BOLD)));
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        headerTable.addCell(leftCell);

        String rightText = "REPUBLIQUE DU SENEGAL\n" +
                "Un Peuple - Un But - Une Foi\n\n" +
                "ETA-CIVIL\n" +
                "CENTRE DE " + centre.toUpperCase();

        PdfPCell rightCell = new PdfPCell(new Paragraph(rightText, FontFactory.getFont(FontFactory.HELVETICA, 10, Font.BOLD)));
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        headerTable.addCell(rightCell);

        document.add(headerTable);

        // Spacer line
        document.add(new Paragraph("\n"));
        LineSeparator line = new LineSeparator(1.5f, 100, null, Element.ALIGN_CENTER, -2);
        document.add(line);
        document.add(new Paragraph("\n"));

        // 2. Title & Registry Info Box
        PdfPTable infoBox = new PdfPTable(2);
        infoBox.setWidthPercentage(100);
        infoBox.setWidths(new float[]{70, 30});

        String dateMariage = getField(data, "Date du mariage", "");
        String annee = "";
        if (dateMariage.contains("/")) {
            String[] parts = dateMariage.split("/");
            annee = parts[parts.length - 1];
        } else if (dateMariage.contains("-")) {
            String[] parts = dateMariage.split("-");
            annee = parts[0];
        }

        String numReg = getField(data, "Numéro de registre", "");

        PdfPCell titleCell = new PdfPCell(new Paragraph("EXTRAIT DU REGISTRE DES ACTES DE MARIAGE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        infoBox.addCell(titleCell);

        PdfPCell regCell = new PdfPCell(new Paragraph("ANNEE: " + annee + "\n\nN° Registre: " + numReg, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        regCell.setBorder(Rectangle.BOX);
        regCell.setPadding(10);
        regCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        infoBox.addCell(regCell);

        document.add(infoBox);
        document.add(new Paragraph("\n\n"));

        // 3. Body Text
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Font.NORMAL);
        Font boldValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Font.NORMAL);

        String prenomEpoux = getField(data, "Prénom Époux", "");
        String nomEpoux = getField(data, "Nom Époux", "");
        String cniEpoux = getField(data, "CNI Époux", "");

        String prenomEpouse = getField(data, "Prénom Épouse", "");
        String nomEpouse = getField(data, "Nom Épouse", "");
        String cniEpouse = getField(data, "CNI Épouse", "");

        String lieuMariage = getField(data, "Lieu du mariage", "");

        document.add(createDottedLineParagraph("Célébré ou enregistré le : ", dateMariage, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("À : ", lieuMariage, labelFont, boldValueFont));
        document.add(new Paragraph("\nENTRE :\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        document.add(createDottedLineParagraph("L'EPOUX (Prénom & Nom) : ", prenomEpoux + " " + nomEpoux, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("CNI Époux : ", cniEpoux, labelFont, boldValueFont));
        document.add(new Paragraph("\nET :\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        document.add(createDottedLineParagraph("L'EPOUSE (Prénom & Nom) : ", prenomEpouse + " " + nomEpouse, labelFont, boldValueFont));
        document.add(createDottedLineParagraph("CNI Épouse : ", cniEpouse, labelFont, boldValueFont));

        document.add(new Paragraph("\n\n"));

        // 4. Bottom / Signatures
        PdfPTable bottomTable = new PdfPTable(2);
        bottomTable.setWidthPercentage(100);
        bottomTable.setWidths(new float[]{50, 50});

        PdfPCell bLeft = new PdfPCell(new Paragraph("Extrait certifié conforme\n" +
                "Référence dossier: " + demande.getReference(), labelFont));
        bLeft.setBorder(Rectangle.BOX);
        bLeft.setPadding(8);
        bottomTable.addCell(bLeft);

        String dateValStr = demande.getDateValidation() != null
                ? demande.getDateValidation().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "";
        String officierNom = demande.getOfficier() != null ? demande.getOfficier().getNomComplet() : "Officier d'État Civil";

        PdfPCell bRight = new PdfPCell();
        bRight.setBorder(Rectangle.NO_BORDER);
        bRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        Paragraph pInfo = new Paragraph("Fait le: " + dateValStr + "\n\nSigné par l'Officier:\n" + officierNom + "\n\n", labelFont);
        pInfo.setAlignment(Element.ALIGN_RIGHT);
        bRight.addElement(pInfo);
        
        addSignatureAndCachetToCell(bRight, demande.getOfficier());
        
        bottomTable.addCell(bRight);

        document.add(bottomTable);
    }

    private String getField(JsonNode node, String key, String defaultValue) {
        if (node == null) return defaultValue;
        
        String searchKey = normalizeKey(key);
        
        java.util.Iterator<java.util.Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            java.util.Map.Entry<String, JsonNode> field = fields.next();
            String normalizedFieldKey = normalizeKey(field.getKey());
            
            if (normalizedFieldKey.equals(searchKey) || 
                normalizedFieldKey.contains(searchKey) || 
                searchKey.contains(normalizedFieldKey)) {
                String val = field.getValue().asText();
                if (val != null && !val.trim().isEmpty()) {
                    return val;
                }
            }
        }
        return defaultValue;
    }

    private void addSignatureAndCachetToCell(PdfPCell cell, com.terangacivil.backend.model.User officier) {
        if (officier == null) return;
        
        try {
            if (officier.getCachetUrl() != null && !officier.getCachetUrl().isEmpty()) {
                String filename = officier.getCachetUrl().substring(officier.getCachetUrl().lastIndexOf("/") + 1);
                String path = new java.io.File("uploads").getAbsolutePath() + java.io.File.separator + filename;
                java.io.File f = new java.io.File(path);
                if (f.exists()) {
                    Image cachetImg = Image.getInstance(path);
                    cachetImg.scaleToFit(80, 80);
                    cachetImg.setAlignment(Element.ALIGN_RIGHT);
                    cell.addElement(cachetImg);
                } else {
                    System.err.println("Cachet file not found at: " + path);
                }
            }
            
            if (officier.getSignatureUrl() != null && !officier.getSignatureUrl().isEmpty()) {
                String filename = officier.getSignatureUrl().substring(officier.getSignatureUrl().lastIndexOf("/") + 1);
                String path = new java.io.File("uploads").getAbsolutePath() + java.io.File.separator + filename;
                java.io.File f = new java.io.File(path);
                if (f.exists()) {
                    Image sigImg = Image.getInstance(path);
                    sigImg.scaleToFit(100, 50);
                    sigImg.setAlignment(Element.ALIGN_RIGHT);
                    cell.addElement(sigImg);
                } else {
                    System.err.println("Signature file not found at: " + path);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String normalizeKey(String key) {
        if (key == null) return "";
        return key.toLowerCase()
                .replaceAll("[éèêë]", "e")
                .replaceAll("[àâä]", "a")
                .replaceAll("[îï]", "i")
                .replaceAll("[ôö]", "o")
                .replaceAll("[ûü]", "u")
                .replaceAll("[ç]", "c")
                .replaceAll("[^a-z0-9]", "");
    }

    private Paragraph createDottedLineParagraph(String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label, labelFont));
        p.add(new Chunk(value.isEmpty() ? "................................................................................" : value, valueFont));
        p.setSpacingAfter(8);
        return p;
    }

    private String generateNin(String sexe, String year, String centre, Integer id) {
        // sex digit: 1 = Masculin, 2 = Féminin
        String sexDigit = "1";
        if (sexe != null && sexe.toLowerCase().contains("fém")) {
            sexDigit = "2";
        }

        // centre code: 3 digits deterministic from the center name
        int hash = Math.abs((centre != null ? centre : "123").hashCode());
        String centreCode = String.format("%03d", (hash % 900) + 100);

        // year: 4 digits
        String yearStr = "2000";
        if (year != null && year.trim().length() >= 4) {
            yearStr = year.trim().substring(0, 4);
        }

        // sequence: 6 digits from ID
        String seqStr = String.format("%06d", (id != null ? id : 1));

        return sexDigit + " " + centreCode + " " + yearStr + " " + seqStr;
    }
}
