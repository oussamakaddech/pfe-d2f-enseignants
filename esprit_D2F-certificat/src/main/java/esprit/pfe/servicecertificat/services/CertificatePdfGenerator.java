package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

public class CertificatePdfGenerator {

    private CertificatePdfGenerator() {
        // Utility class — not instantiable
    }

    /**
     * Génère un certificat PDF pour un enseignant.
     *
     * @param outputPath      chemin du fichier PDF à générer
     * @param msg             informations de la formation
     * @param teacher         informations de l'enseignant
     * @param backgroundBytes tableau de bytes de l'image d'arrière-plan
     * @throws Exception en cas d'erreur
     */
    public static void generateCertificateForTeacher(String outputPath,
                                                     CertificateBatchMessage msg,
                                                     CertificateBatchMessage.EnseignantPresenceInfo teacher,
                                                     byte[] backgroundBytes) throws Exception {
        generateCertificateForTeacher(outputPath, msg, teacher, backgroundBytes, null, null);
    }

    /**
     * Génère un certificat PDF avec QR code de vérification intégré (étape 5).
     *
     * @param verificationUrl URL publique encodée dans le QR code (peut être null)
     * @param qrBytes         image PNG du QR code (peut être null)
     */
    public static void generateCertificateForTeacher(String outputPath,
                                                     CertificateBatchMessage msg,
                                                     CertificateBatchMessage.EnseignantPresenceInfo teacher,
                                                     byte[] backgroundBytes,
                                                     String verificationUrl,
                                                     byte[] qrBytes) throws Exception {

        try (PdfWriter writer = new PdfWriter(outputPath);
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf)) {

            // Si on a des bytes pour l'image, on la charge
            if (backgroundBytes != null && backgroundBytes.length > 0) {
                ImageData bgData = ImageDataFactory.create(backgroundBytes);
                Image background = new Image(bgData);
                background.scaleToFit(pdf.getDefaultPageSize().getWidth(), pdf.getDefaultPageSize().getHeight());
                background.setFixedPosition(0, 0);
                document.add(background);
            }

            PdfFont font = PdfFontFactory.createFont();

            // Titre du certificat
            Paragraph title = new Paragraph("Attestation de Formation")
                    .setFont(font)
                    .setFontSize(24)
                    .setFontColor(ColorConstants.BLACK)
                    .setTextAlignment(TextAlignment.CENTER);
            document.add(title);

            // Détails de la formation
            Paragraph formationDetails = new Paragraph()
                    .setFont(font)
                    .setFontSize(16)
                    .setFontColor(ColorConstants.BLACK)
                    .setTextAlignment(TextAlignment.CENTER);
            formationDetails.add("Formation : " + msg.getTitreFormation() + "\n");
            formationDetails.add("Type : " + msg.getTypeCertif() + "\n");
            formationDetails.add("Du : " + msg.getDateDebutFormation() + " au " + msg.getDateFinFormation() + "\n");
            formationDetails.add("Charge Horaire : " + msg.getChargeHoraireGlobal() + " h\n");
            document.add(formationDetails);

            // Détails de l'enseignant
            Paragraph teacherDetails = new Paragraph()
                    .setFont(font)
                    .setFontSize(14)
                    .setFontColor(ColorConstants.BLACK)
                    .setTextAlignment(TextAlignment.CENTER);
            teacherDetails.add("Animateur : " + teacher.getNom() + " " + teacher.getPrenom() + "\n");
            teacherDetails.add("Email : " + teacher.getMail() + "\n");
            teacherDetails.add("Département : " + teacher.getDeptEnseignantLibelle() + "\n");
            teacherDetails.add("Rôle : " + teacher.getRole() + "\n");
            document.add(teacherDetails);

            // Date d'émission (using LocalDate — thread-safe & not deprecated)
            Paragraph issuedDate = new Paragraph("Émis le : " + LocalDate.now(ZoneId.of("UTC")))
                    .setFont(font)
                    .setFontSize(12)
                    .setFontColor(ColorConstants.DARK_GRAY)
                    .setTextAlignment(TextAlignment.RIGHT);
            document.add(issuedDate);

            // QR code de vérification (étape 5) — encode uniquement l'URL publique
            // de vérification ; aucune donnée personnelle n'est encodée.
            if (qrBytes != null && qrBytes.length > 0) {
                ImageData qrData = ImageDataFactory.create(qrBytes);
                Image qrImage = new Image(qrData);
                qrImage.scaleToFit(90, 90);
                qrImage.setFixedPosition(pdf.getDefaultPageSize().getWidth() - 110, 40);
                document.add(qrImage);
                if (verificationUrl != null && !verificationUrl.isBlank()) {
                    Paragraph verify = new Paragraph("Vérifier ce certificat : " + verificationUrl)
                            .setFont(font)
                            .setFontSize(7)
                            .setFontColor(ColorConstants.DARK_GRAY)
                            .setTextAlignment(TextAlignment.RIGHT);
                    document.add(verify);
                }
            }
        }
    }

    /**
     * Génère les certificats PDF pour tous les enseignants présents et renvoie la liste des noms de fichiers générés.
     *
     * @param msg             informations de la formation et des enseignants
     * @param backgroundBytes tableau de bytes de l'image d'arrière-plan
     * @return liste des noms de fichiers PDF générés
     * @throws Exception en cas d'erreur
     */
    public static List<String> generateCertificatesForAllTeachers(CertificateBatchMessage msg, byte[] backgroundBytes) throws Exception {
        return generateCertificatesForAllTeachers(msg, backgroundBytes, "");
    }

    public static List<String> generateCertificatesForAllTeachers(CertificateBatchMessage msg, byte[] backgroundBytes, String outputDir) throws Exception {
        return generateCertificatesForAllTeachers(msg, backgroundBytes, outputDir, null, null);
    }

    /**
     * Génère les certificats PDF avec QR code de vérification intégré.
     *
     * @param qrByEnseignant  image PNG du QR code par enseignant (optionnel)
     * @param urlByEnseignant URL de vérification par enseignant (optionnel)
     */
    public static List<String> generateCertificatesForAllTeachers(CertificateBatchMessage msg,
                                                                  byte[] backgroundBytes,
                                                                  String outputDir,
                                                                  java.util.Map<String, byte[]> qrByEnseignant,
                                                                  java.util.Map<String, String> urlByEnseignant) throws Exception {
        List<String> outputPaths = new ArrayList<>();
        if (msg.getEnseignants() != null) {
            for (CertificateBatchMessage.EnseignantPresenceInfo teacher : msg.getEnseignants()) {
                if (teacher.isPresent()) {
                    String outputPath = outputDir + "certificate_" + msg.getFormationId() + "_" + teacher.getEnseignantId() + ".pdf";
                    byte[] qrBytes = qrByEnseignant != null ? qrByEnseignant.get(teacher.getEnseignantId()) : null;
                    String verificationUrl = urlByEnseignant != null ? urlByEnseignant.get(teacher.getEnseignantId()) : null;
                    generateCertificateForTeacher(outputPath, msg, teacher, backgroundBytes, verificationUrl, qrBytes);
                    outputPaths.add(outputPath);
                }
            }
        }
        return outputPaths;
    }
}
