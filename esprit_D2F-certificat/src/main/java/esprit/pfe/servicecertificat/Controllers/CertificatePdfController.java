package esprit.pfe.servicecertificat.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.servicecertificat.dto.CertificateBatchMessage;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.services.CertificateService;
import esprit.pfe.servicecertificat.services.CertificatePdfGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/certificate-pdfs")
public class CertificatePdfController {

    private final CertificateService certificateService;
    private final Resource backgroundImageResource;

    public CertificatePdfController(CertificateService certificateService,
                                  @Value("classpath:templates/background.jpg") Resource backgroundImageResource) {
        this.certificateService = certificateService;
        this.backgroundImageResource = backgroundImageResource;
    }

    @GetMapping("/generate/{formationId}")
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_CREATE)
    public ResponseEntity<Object> generatePdfForFormation(@PathVariable @NonNull Long formationId) {
        try {
            List<CertificateResponse> certs = certificateService.findByFormation(formationId);
            if (certs.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Aucun certificat trouvé pour la formation avec id " + formationId);
            }

            CertificateBatchMessage message = new CertificateBatchMessage();
            CertificateResponse ref = certs.get(0);
            message.setFormationId(ref.getFormationId());
            message.setTitreFormation(ref.getTitreFormation());
            message.setTypeCertif(ref.getTypeCertif());
            message.setDateDebutFormation(ref.getDateDebutFormation());
            message.setDateFinFormation(ref.getDateFinFormation());
            message.setChargeHoraireGlobal(ref.getChargeHoraireGlobal());

            List<CertificateBatchMessage.EnseignantPresenceInfo> enseignants = new ArrayList<>();
            for (CertificateResponse cert : certs) {
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
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_READ)
    public ResponseEntity<Object> getPdfPathsByFormation(@PathVariable @NonNull Long formationId) {
        try {
            List<CertificateResponse> certs = certificateService.findByFormation(formationId);
            List<String> paths = certs.stream()
                    .map(CertificateResponse::getPdfFilePath)
                    .filter(path -> path != null && !path.isEmpty())
                    .toList();
            return ResponseEntity.ok((Object) paths);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la récupération des chemins PDF : " + e.getMessage());
        }
    }
}
