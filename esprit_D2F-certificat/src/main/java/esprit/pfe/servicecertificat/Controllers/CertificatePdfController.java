package esprit.pfe.servicecertificat.Controllers;

import esprit.pfe.servicecertificat.DTO.CertificateBatchMessage;
import esprit.pfe.servicecertificat.Entities.Certificate;
import esprit.pfe.servicecertificat.Repositories.CertificateRepository;
import esprit.pfe.servicecertificat.Services.CertificatePdfGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/certificate-pdfs")
public class CertificatePdfController {

    @Autowired
    private CertificateRepository certificateRepository;

    // Injection de l'image d'arrière-plan depuis le classpath (assurez-vous que background.jpg se trouve dans src/main/resources/templates/)
    @Value("classpath:templates/background.jpg")
    private Resource backgroundImageResource;

    /**
     * Génère les certificats PDF pour une formation donnée et renvoie les noms des fichiers générés.
     * Cette méthode ne met pas à jour la base.
     * Exemple d’URL : GET /certificate-pdfs/generate/1
     */
    @GetMapping("/generate/{formationId}")
    public ResponseEntity<?> generatePdfForFormation(@PathVariable Long formationId) {
        try {
            // Récupérer tous les certificats de la formation
            List<Certificate> certs = certificateRepository.findByFormationId(formationId);
            if (certs.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Aucun certificat trouvé pour la formation avec id " + formationId);
            }

            // Construire un objet CertificateBatchMessage à partir des certificats récupérés
            CertificateBatchMessage message = new CertificateBatchMessage();
            // On se base sur le premier certificat pour récupérer les infos de formation
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
                // On considère que tous les enseignants doivent recevoir leur certificat
                info.setPresent(true);
                enseignants.add(info);
            }
            message.setEnseignants(enseignants);

            // Charger l'image d'arrière-plan depuis le classpath sous forme de bytes
            byte[] bgBytes = backgroundImageResource.getInputStream().readAllBytes();

            // Appel à la méthode de génération qui crée les PDF et renvoie la liste des noms de fichiers
            List<String> generatedPdfs = CertificatePdfGenerator.generateCertificatesForAllTeachers(message, bgBytes);
            return ResponseEntity.ok(generatedPdfs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la génération des certificats PDF : " + e.getMessage());
        }
    }

    /**
     * Ancien endpoint pour récupérer les chemins PDF enregistrés (non utilisé si vous ne stockez pas le path)
     */
    @GetMapping("/formation/{formationId}")
    public ResponseEntity<?> getPdfPathsByFormation(@PathVariable Long formationId) {
        try {
            List<Certificate> certs = certificateRepository.findByFormationId(formationId);
            List<String> paths = certs.stream()
                    .map(Certificate::getPdfFilePath)
                    .filter(path -> path != null && !path.isEmpty())
                    .collect(Collectors.toList());
            return ResponseEntity.ok(paths);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la récupération des chemins PDF : " + e.getMessage());
        }
    }
}
