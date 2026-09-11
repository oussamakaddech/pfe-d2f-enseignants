package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.exception.PdfGenerationException;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@Slf4j
public class CertificateListenerService {

    private final CertificateRepository certificateRepository;
    private final Resource backgroundImageResource;

    public CertificateListenerService(CertificateRepository certificateRepository,
                                      @Value("classpath:templates/background.jpg") Resource backgroundImageResource) {
        this.certificateRepository = certificateRepository;
        this.backgroundImageResource = backgroundImageResource;
    }

    @Transactional
    @RabbitListener(queues = "certificateQueue")
    public void onCertificateBatchMessage(CertificateBatchMessage message) {
        log.info("🤝 Reçu message JMS: formationId={}, titre='{}', #Enseignants={}",
                message.getFormationId(),
                message.getTitreFormation(),
                (message.getEnseignants() != null ? message.getEnseignants().size() : 0)
        );

        if (message.getEnseignants() == null || message.getEnseignants().isEmpty()) {
            log.warn("Pas d'enseignants dans ce message => rien à traiter.");
            return;
        }

        // Pour chaque enseignant, enregistrer un Certificate en base (sans renseigner pdfFilePath)
        for (CertificateBatchMessage.EnseignantPresenceInfo info : message.getEnseignants()) {
            Certificate cert = new Certificate();
            cert.setFormationId(message.getFormationId());
            cert.setTitreFormation(message.getTitreFormation());
            cert.setTypeCertif(message.getTypeCertif());
            cert.setDateDebutFormation(message.getDateDebutFormation());
            cert.setDateFinFormation(message.getDateFinFormation());
            cert.setChargeHoraireGlobal(message.getChargeHoraireGlobal());
            cert.setEnseignantId(info.getEnseignantId());
            cert.setNomEnseignant(info.getNom());
            cert.setPrenomEnseignant(info.getPrenom());
            cert.setMailEnseignant(info.getMail());
            cert.setDeptEnseignant(info.getDeptEnseignantLibelle());
            cert.setRoleEnFormation(info.getRole());
            cert.setDelivered(false);
                String token = UUID.randomUUID().toString();
                cert.setVerificationToken(token);
                cert.setVerificationHash(sha256(token + ":" + message.getFormationId()
                    + ":" + info.getEnseignantId()));
                cert.setIssuedAt(OffsetDateTime.now(ZoneOffset.UTC));
                cert.setCertificateNumber("CERT-%d-%06d".formatted(
                    cert.getIssuedAt().getYear(), Math.abs(token.hashCode()) % 1_000_000));
                cert.setCertificateStatus("ISSUED");
            certificateRepository.save(cert);
            log.debug("→ Enregistré Certificate pour enseignantId={} (role={}).", info.getEnseignantId(), info.getRole());
        }

        // Générer les certificats PDF sans mettre à jour la base avec le chemin
        try (var bgStream = backgroundImageResource.getInputStream()) {
            // Charger l'image d'arrière-plan en tant que tableau de bytes
            byte[] bgBytes = bgStream.readAllBytes();
            List<String> generatedPdfs = CertificatePdfGenerator.generateCertificatesForAllTeachers(message, bgBytes);
            log.info("Certificats PDF générés : {}", generatedPdfs);
        } catch (Exception e) {
            log.error("Erreur lors de la génération des PDF de certificats", e);
            throw new PdfGenerationException("Erreur lors de la génération des PDF de certificats", e);
        }

        log.info("✅ Fin traitement: {} certificats créés pour la formationId={}.",
                message.getEnseignants().size(),
                message.getFormationId());
    }

    /** Hash SHA-256 (hexadécimal) du triplet token:formationId:enseignantId. */
    private String sha256(String value) {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
    }
}
