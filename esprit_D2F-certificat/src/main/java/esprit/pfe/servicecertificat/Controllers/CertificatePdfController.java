package esprit.pfe.servicecertificat.controllers;

import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import esprit.pfe.servicecertificat.services.CertificatePdfGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/certificate-pdfs")
public class CertificatePdfController {

    private final CertificateRepository certificateRepository;
    private final Resource backgroundImageResource;

    public CertificatePdfController(CertificateRepository certificateRepository,
                                  @Value("classpath:templates/background.jpg") Resource backgroundImageResource) {
        this.certificateRepository = certificateRepository;
        this.backgroundImageResource = backgroundImageResource;
    }

    @GetMapping("/generate/{formationId}")
    public ResponseEntity<Object> generatePdfForFormation(@PathVariable @NonNull Long formationId) {
        try {
            List<Certificate> certs = certificateRepository.findByFormationId(formationId);
            if (certs.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Aucun certificat trouvé pour la formation avec id " + formationId);
            }

            CertificateBatchMessage message = new CertificateBatchMessage();
            Certificate ref = certs.get(0);
            message.setFormationId(ref.getFormationId());
            message.setTitreFormation(ref.getTitreFormation());
            message.setTypeCertif(ref.getTypeCertif());
            message.setDateDebutFormation(ref.getDateDebutFormation());
            message.setDateFinFormation(ref.getDateFinFormation());
            message.setChargeHoraireGlobal(ref.getChargeHoraireGlobal());

            List<CertificateBatchMessage.EnseignantPresenceInfo> enseignants = new ArrayList<>();
            for (Certificate cert : certs) {
                CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
                info.setEnseignantId(cert.getEnseignantId());
                info.setNom(cert.getNomEnseignant());
                info.setPrenom(cert.getPrenomEnseignant());
                info.setMail(cert.getMailEnseignant());
                info.setDeptEnseignantLibelle(cert.getDeptEnseignant());
                info.setRole(cert.getRoleEnFormation());
                info.setPresent(true);
                enseignants.add(info);
            }
            message.setEnseignants(enseignants);

            byte[] bgBytes = backgroundImageResource.getInputStream().readAllBytes();
            List<String> generatedPdfs = CertificatePdfGenerator.generateCertificatesForAllTeachers(message, bgBytes);
            return ResponseEntity.ok((Object) generatedPdfs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la génération des certificats PDF : " + e.getMessage());
        }
    }

    @GetMapping("/formation/{formationId}")
    public ResponseEntity<Object> getPdfPathsByFormation(@PathVariable @NonNull Long formationId) {
        try {
            List<Certificate> certs = certificateRepository.findByFormationId(formationId);
            List<String> paths = certs.stream()
                    .map(Certificate::getPdfFilePath)
                    .filter(path -> path != null && !path.isEmpty())
                    .toList();
            return ResponseEntity.ok((Object) paths);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la récupération des chemins PDF : " + e.getMessage());
        }
    }
}
