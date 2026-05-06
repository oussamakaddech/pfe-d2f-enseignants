package esprit.pfe.servicecertificat.Controllers;

import esprit.pfe.servicecertificat.DTO.CertificateRequest;
import esprit.pfe.servicecertificat.DTO.CertificateResponse;
import esprit.pfe.servicecertificat.Entities.Certificate;
import esprit.pfe.servicecertificat.Repositories.CertificateRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/certificates")
public class CertificateController {

    @Autowired
    private CertificateRepository certificateRepository;

    @PostMapping
    public ResponseEntity<CertificateResponse> createCertificate(@Valid @RequestBody CertificateRequest request) {
        Certificate certificate = mapToEntity(request);
        certificate.setDelivered(false);
        Certificate saved = certificateRepository.save(certificate);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @GetMapping
    public List<CertificateResponse> getAll() {
        return certificateRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/formation/{formationId}")
    public List<CertificateResponse> getByFormation(@PathVariable Long formationId) {
        return certificateRepository.findByFormationId(formationId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<CertificateResponse> deliver(@PathVariable Long id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificat introuvable"));
        cert.setDelivered(true);
        return ResponseEntity.ok(mapToResponse(certificateRepository.save(cert)));
    }

    @GetMapping("/email")
    public List<CertificateResponse> getByEmail(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaim("email");
        return certificateRepository.findByMailEnseignant(email).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<CertificateResponse> updateCertificate(@PathVariable Long id, @Valid @RequestBody CertificateRequest request) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificat introuvable"));
        
        cert.setTitreFormation(request.getTitreFormation());
        cert.setTypeCertif(request.getTypeCertif());
        cert.setDateDebutFormation(request.getDateDebutFormation());
        cert.setDateFinFormation(request.getDateFinFormation());
        cert.setChargeHoraireGlobal(request.getChargeHoraireGlobal());
        cert.setNomEnseignant(request.getNomEnseignant());
        cert.setPrenomEnseignant(request.getPrenomEnseignant());
        cert.setMailEnseignant(request.getMailEnseignant());
        cert.setDeptEnseignant(request.getDeptEnseignant());
        cert.setRoleEnFormation(request.getRoleEnFormation());
        cert.setEnseignantId(request.getEnseignantId());
        cert.setFormationId(request.getFormationId());

        return ResponseEntity.ok(mapToResponse(certificateRepository.save(cert)));
    }

    private CertificateResponse mapToResponse(Certificate entity) {
        CertificateResponse res = new CertificateResponse();
        res.setId(entity.getIdCertificate());
        res.setFormationId(entity.getFormationId());
        res.setTitreFormation(entity.getTitreFormation());
        res.setTypeCertif(entity.getTypeCertif());
        res.setDateDebutFormation(entity.getDateDebutFormation());
        res.setDateFinFormation(entity.getDateFinFormation());
        res.setChargeHoraireGlobal(entity.getChargeHoraireGlobal());
        res.setEnseignantId(entity.getEnseignantId());
        res.setNomEnseignant(entity.getNomEnseignant());
        res.setPrenomEnseignant(entity.getPrenomEnseignant());
        res.setMailEnseignant(entity.getMailEnseignant());
        res.setDeptEnseignant(entity.getDeptEnseignant());
        res.setRoleEnFormation(entity.getRoleEnFormation());
        res.setDelivered(entity.isDelivered());
        return res;
    }

    private Certificate mapToEntity(CertificateRequest req) {
        Certificate cert = new Certificate();
        cert.setFormationId(req.getFormationId());
        cert.setTitreFormation(req.getTitreFormation());
        cert.setTypeCertif(req.getTypeCertif());
        cert.setDateDebutFormation(req.getDateDebutFormation());
        cert.setDateFinFormation(req.getDateFinFormation());
        cert.setChargeHoraireGlobal(req.getChargeHoraireGlobal());
        cert.setEnseignantId(req.getEnseignantId());
        cert.setNomEnseignant(req.getNomEnseignant());
        cert.setPrenomEnseignant(req.getPrenomEnseignant());
        cert.setMailEnseignant(req.getMailEnseignant());
        cert.setDeptEnseignant(req.getDeptEnseignant());
        cert.setRoleEnFormation(req.getRoleEnFormation());
        return cert;
    }
}


