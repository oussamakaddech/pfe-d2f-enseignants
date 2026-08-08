package esprit.pfe.servicecertificat.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.services.CertificateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/certificates")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(
        name = "Certificats",
        description = "Génération et consultation des certificats PDF de formation."
)
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name = "bearerAuth")
public class CertificateController {

    private final CertificateService certificateService;

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_CREATE)
    public ResponseEntity<CertificateResponse> createCertificate(@Valid @RequestBody CertificateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(certificateService.create(request));
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_READ)
    public Page<CertificateResponse> getAll(Pageable pageable) {
        return certificateService.findAll(pageable);
    }

    @GetMapping("/formation/{formationId}")
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_READ)
    public Page<CertificateResponse> getByFormation(
            @PathVariable Long formationId,
            @PageableDefault(size = 20) Pageable pageable) {
        return certificateService.findByFormation(formationId, pageable);
    }

    @PutMapping("/{id}/deliver")
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_UPDATE)
    public ResponseEntity<CertificateResponse> deliver(@PathVariable Long id) {
        return ResponseEntity.ok(certificateService.deliver(id));
    }

    @GetMapping("/email")
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_READ)
    public Page<CertificateResponse> getByEmail(
            @AuthenticationPrincipal Jwt jwt,
            @PageableDefault(size = 20) Pageable pageable) {
        String email = jwt.getClaim("email");
        return certificateService.findByEmail(email, pageable);
    }

    @GetMapping("/enseignant/{enseignantId}")
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_READ)
    public ResponseEntity<Page<CertificateResponse>> getByEnseignant(
            @PathVariable String enseignantId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(certificateService.findByEnseignant(enseignantId, pageable));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_UPDATE)
    public ResponseEntity<CertificateResponse> updateCertificate(@PathVariable Long id,
            @Valid @RequestBody CertificateRequest request) {
        return ResponseEntity.ok(certificateService.update(id, request));
    }
}
