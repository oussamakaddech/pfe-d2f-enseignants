package esprit.pfe.servicecertificat.Services;

import esprit.pfe.servicecertificat.DTO.CertificateBatchMessage;
import esprit.pfe.servicecertificat.Entities.Certificate;
import esprit.pfe.servicecertificat.Repositories.CertificateRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
public class CertificateListenerService {

    @Autowired
    private CertificateRepository certificateRepository;

    // Injection de l'image d'arrière-plan depuis le classpath (assurez-vous que le fichier est placé dans src/main/resources/templates/)
    @Value("classpath:templates/background.jpg")
    private Resource backgroundImageResource;

    @Transactional
    @JmsListener(destination = "certificateQueue")
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
            certificateRepository.save(cert);
            log.debug("→ Enregistré Certificate pour enseignantId={} (role={}).", info.getEnseignantId(), info.getRole());
        }

        // Générer les certificats PDF sans mettre à jour la base avec le chemin
        try {
            // Charger l'image d'arrière-plan en tant que tableau de bytes
            byte[] bgBytes = backgroundImageResource.getInputStream().readAllBytes();
            List<String> generatedPdfs = CertificatePdfGenerator.generateCertificatesForAllTeachers(message, bgBytes);
            log.info("Certificats PDF générés : {}", generatedPdfs);
        } catch (Exception e) {
            log.error("Erreur lors de la génération des PDF de certificats", e);
            throw new RuntimeException("Erreur lors de la génération des PDF de certificats", e);
        }

        log.info("✅ Fin traitement: {} certificats créés pour la formationId={}.",
                message.getEnseignants().size(),
                message.getFormationId());
    }
}
