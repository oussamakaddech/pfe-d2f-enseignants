
package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.CertificateEligibilitySummaryDTO;
import esprit.pfe.serviceformation.services.CertificateEligibilityService;
import esprit.pfe.serviceformation.services.FormationClosureService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/formations-custom")
@RequiredArgsConstructor
public class FormationCustomController {
    private final FormationClosureService formationClosureService;
    private final CertificateEligibilityService certificateEligibilityService;

    @PutMapping("/{formationId}/generate-certificates")
    @PreAuthorize(AuthorizationMatrix.FORMATION_APPROVE)
    public ResponseEntity<String> generateCertificates(
            @PathVariable Long formationId,
            @RequestParam(defaultValue = "CERTIF") String typeCertif
    ) {
        String type = typeCertif == null ? "" : typeCertif.trim().toUpperCase();
        boolean isCertif = type.equals("CERTIF");
        // ATTESTATION / BADGE = documents de participation (présence seule) ;
        // CERTIF = certification (présence + post-test + évaluation).
        if (!isCertif && !type.equals("ATTESTATION") && !type.equals("BADGE")) {
            return ResponseEntity.badRequest().body(
                    "Type de document invalide : " + typeCertif
                    + " — valeurs autorisées : CERTIF, ATTESTATION, BADGE.");
        }
        try {
            formationClosureService.generateCertificates(formationId, type);
            String docLabel = switch (type) {
                case "ATTESTATION" -> "Attestations";
                case "BADGE" -> "Badges";
                default -> "Certificats";
            };
            String successMsg = docLabel + " générés pour formation " + formationId
                    + " avec type = " + type;
            return ResponseEntity.ok(successMsg);

        } catch (RuntimeException ex) {
            // On reconnaît l'exception levée quand c'est déjà généré
            if (ex.getMessage().contains("déjà été générés")) {
                String conflictMsg = "Les certificats ont déjà été générés pour cette formation.";
                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body(conflictMsg);
            }
            // Pour tout autre cas, on remonte l'exception (ou renvoie 500)
            throw ex;
        }
    }

    /**
     * Éligibilité d'un participant à la certification : présence, post-test,
     * évaluation du formateur. Permet au CUP de vérifier les critères avant
     * la génération des certificats (étape 4).
     */
    @GetMapping("/{formationId}/certificates/eligibility/{participantId}")
    @PreAuthorize(AuthorizationMatrix.CERTIFICAT_READ)
    public ResponseEntity<CertificateEligibilitySummaryDTO> getEligibility(
            @PathVariable Long formationId,
            @PathVariable String participantId
    ) {
        return ResponseEntity.ok(
                certificateEligibilityService.evaluateEligibilityWithSummary(formationId, participantId));
    }
}

