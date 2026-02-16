package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.DTO.*;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Services.ExportExcelService;
import esprit.pfe.serviceformation.Services.FormationWorkflowService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Map;
@Slf4j
@RestController
@RequestMapping("/formations-workflow")
public class FormationWorkflowController {

    @Autowired
    private ExportExcelService exportExcelService;

    @Autowired
    private FormationWorkflowService formationWorkflowService;

    @PostMapping
    public ResponseEntity<?> createFormation(@RequestBody FormationWorkflowRequest request) {
        try {
            Formation formation = formationWorkflowService.createFormationWorkflow(request);
            FormationDTO dto = formationWorkflowService.mapFormationToDTO(formation);
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);

        } catch (IllegalArgumentException e) {
            // Erreur de validation ou paramètre invalide => 400
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            // Autres erreurs => 500
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFormation(@PathVariable Long id, @RequestBody FormationWorkflowRequest request) {
        try {
            Formation formation = formationWorkflowService.updateFormationWorkflow(id, request);
            if (formation == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Formation non trouvée après mise à jour."));
            }
            FormationDTO dto = formationWorkflowService.mapFormationToDTO(formation);
            return ResponseEntity.ok(dto);

        } catch (IllegalArgumentException e) {
            // Erreur de validation => 400
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            // Autres erreurs => 500
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFormation(@PathVariable Long id) {
        try {
            formationWorkflowService.deleteFormationWorkflow(id);
            return ResponseEntity.ok("Formation supprimée avec succès !");

        } catch (IllegalArgumentException e) {
            // Par exemple, si l'id n'existe pas => 400
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getFormationById(@PathVariable Long id) {
        try {
            FormationDTO dto = formationWorkflowService.getFormationWorkflowById(id);
            return ResponseEntity.ok(dto);

        } catch (IllegalArgumentException e) {
            // Formation non trouvée => 400 ou 404
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllFormations() {
        try {
            List<FormationDTO> dtos = formationWorkflowService.getAllFormationWorkflows();
            return ResponseEntity.ok(dtos);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    @PutMapping("/presence/{id}")
    public ResponseEntity<?> updatePresence(@PathVariable Long id,
                                            @RequestParam boolean present,
                                            @RequestParam String commentaire) {
        try {
            formationWorkflowService.updatePresence(id, present, commentaire);
            return ResponseEntity.ok("Présence mise à jour avec succès !");

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/export/excel")
    public ResponseEntity<?> exportExcel(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate
    ) {
        try {
            // Génère le fichier
            ByteArrayOutputStream out = exportExcelService.exportFormationsAvance(startDate, endDate);
            byte[] content = out.toByteArray();

            // Prépare les headers pour un téléchargement Excel
            HttpHeaders headers = new HttpHeaders();
            headers.setContentDisposition(
                    ContentDisposition
                            .attachment()
                            .filename(String.format("formations_%tF_%tF.xlsx", startDate, endDate))
                            .build()
            );
            headers.setContentType(MediaType
                    .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .body(content);

        } catch (Exception e) {
            // Log côté serveur
            log.error("❌ Erreur lors de l'export Excel", e);

            // On renvoie un JSON avec erreur + message
            Map<String, String> body = Map.of(
                    "error", "Erreur interne",
                    "message", e.getMessage()
            );
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(body);
        }
    }


    // Endpoint pour récupérer les formations où l'utilisateur connecté est animateur
    @GetMapping("/animateur")
    public ResponseEntity<List<FormationDTO>> getFormationsByAnimateurEmail(@AuthenticationPrincipal Jwt jwt) {
        // Extraction de l'email du token
        String email = jwt.getClaim("email");
        // Appel du service
        List<FormationDTO> formations = formationWorkflowService.getFormationsByAnimateurEmail(email);
        return ResponseEntity.ok(formations);
    }

    // Endpoint pour récupérer la liste des présences d'une séance
    @GetMapping("/seances/{seanceId}/presences")
    public ResponseEntity<List<PresenceDTO>> getPresencesBySeance(@PathVariable("seanceId") Long seanceId) {
        List<PresenceDTO> presences = formationWorkflowService.getPresencesBySeance(seanceId);
        return ResponseEntity.ok(presences);
    }


    @GetMapping("/achevees")
    public ResponseEntity<?> getFormationsAchevees() {
        try {
            List<FormationDTO> achevees = formationWorkflowService.getFormationsAchevees();
            return ResponseEntity.ok(achevees);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    @GetMapping("/with-documents")
    public ResponseEntity<List<FormationWithDocumentsDTO>> getAllFormationsWithDocuments() {
        List<FormationWithDocumentsDTO> dtos = formationWorkflowService.getAllFormationsWithDocuments();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/enseignants/{id}/calendar")
    public ResponseEntity<FormationsByRoleDTO> getCalendarFormations(
            @PathVariable("id") String enseignantId
    ) {
        FormationsByRoleDTO dto = formationWorkflowService.getFormationsForCalendar(enseignantId);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}/inscriptionsOuvertes")

    public FormationDTO updateInscriptionsOuvertes(
            @PathVariable Long id,
            @RequestParam boolean ouvert) {
        return formationWorkflowService.setInscriptionsOuvertes(id, ouvert);
    }



    @GetMapping("/visibles")

    public List<FormationDTO> getFormationsVisibles() {
        return formationWorkflowService.getFormationsVisibles();
    }


    @GetMapping("/par-up")

    public List<FormationDTO> getFormationsParUp(@RequestParam String upId) {
        return formationWorkflowService.getFormationsParUp(upId);
    }
}

