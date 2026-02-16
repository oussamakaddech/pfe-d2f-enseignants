
package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.Services.FormationClosureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/formations-custom")
public class FormationCustomController {

    @Autowired
    private FormationClosureService formationClosureService;

    @PutMapping("/{formationId}/generate-certificates")
    public ResponseEntity<String> generateCertificates(
            @PathVariable Long formationId,
            @RequestParam(defaultValue = "CERTIF") String typeCertif
    ) {
        try {
            formationClosureService.generateCertificates(formationId, typeCertif);
            String successMsg = "Certificats générés pour formation " + formationId
                    + " avec type = " + typeCertif;
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
}
