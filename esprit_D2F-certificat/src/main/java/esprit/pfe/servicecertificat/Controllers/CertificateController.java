package esprit.pfe.servicecertificat.Controllers;

import esprit.pfe.servicecertificat.Entities.Certificate;
import esprit.pfe.servicecertificat.Repositories.CertificateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/certificates")
public class CertificateController {

    @Autowired
    private CertificateRepository certificateRepository;

    @PostMapping
    public ResponseEntity<Certificate> createCertificate(@RequestBody Certificate certificate) {
        // Par défaut, on considère qu'il n'est pas encore délivré
        certificate.setDelivered(false);
        // Enregistrer en base
        Certificate saved = certificateRepository.save(certificate);
        // Retourner le certificat créé avec le code HTTP 201
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }
    @GetMapping
    public List<Certificate> getAll() {
        return certificateRepository.findAll();
    }

    @GetMapping("/formation/{formationId}")
    public List<Certificate> getByFormation(@PathVariable Long formationId) {
        return certificateRepository.findByFormationId(formationId);
    }

    @PutMapping("/{id}/deliver")
    public Certificate deliver(@PathVariable Long id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificat introuvable"));
        cert.setDelivered(true);
        return certificateRepository.save(cert);
    }


    @GetMapping("/email")
    public List<Certificate> getByEmail(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaim("email");
        return certificateRepository.findByMailEnseignant(email);
    }
    @PutMapping("/{id}")
    public Certificate updateCertificate(@PathVariable Long id, @RequestBody Certificate updatedCertificate) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificat introuvable"));
        cert.setTitreFormation(updatedCertificate.getTitreFormation());
        cert.setTypeCertif(updatedCertificate.getTypeCertif());
        cert.setDateDebutFormation(updatedCertificate.getDateDebutFormation());
        cert.setDateFinFormation(updatedCertificate.getDateFinFormation());
        cert.setChargeHoraireGlobal(updatedCertificate.getChargeHoraireGlobal());
        cert.setNomEnseignant(updatedCertificate.getNomEnseignant());
        cert.setPrenomEnseignant(updatedCertificate.getPrenomEnseignant());
        cert.setMailEnseignant(updatedCertificate.getMailEnseignant());
        cert.setDeptEnseignant(updatedCertificate.getDeptEnseignant());
        cert.setRoleEnFormation(updatedCertificate.getRoleEnFormation());
        return certificateRepository.save(cert);
    }

}
