package esprit.pfe.servicecertificat.controllers;

import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.exception.ResourceNotFoundException;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/certificates")
public class CertificateController {

    private final CertificateRepository certificateRepository;

    public CertificateController(CertificateRepository certificateRepository) {
        this.certificateRepository = certificateRepository;
    }

    @PostMapping
    public ResponseEntity<CertificateResponse> createCertificate(@Valid @RequestBody CertificateRequest request) {
        Certificate certificate = mapToEntity(request);
        certificate.setDelivered(false);
        Certificate saved = certificateRepository.save(certificate);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @GetMapping
    public Page<CertificateResponse> getAll(Pageable pageable) {
        return certificateRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @GetMapping("/formation/{formationId}")
    public List<CertificateResponse> getByFormation(@PathVariable Long formationId) {
        return certificateRepository.findByFormationId(formationId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<CertificateResponse> deliver(@PathVariable Long id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable"));
        cert.setDelivered(true);
        return ResponseEntity.ok(mapToResponse(certificateRepository.save(cert)));
    }

    @GetMapping("/email")
    public List<CertificateResponse> getByEmail(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaim("email");
        return certificateRepository.findByMailEnseignant(email).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @PutMapping("/{id}")
    public ResponseEntity<CertificateResponse> updateCertificate(@PathVariable Long id,
            @Valid @RequestBody CertificateRequest request) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable"));

        updateEntityFromRequest(cert, request);

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
        updateEntityFromRequest(cert, req);
        return cert;
    }

    private void updateEntityFromRequest(Certificate cert, CertificateRequest req) {
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
    }
}
