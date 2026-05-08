package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.services.ExportExcelService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.util.Date;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;
@Slf4j
@RestController
@RequestMapping("/api/v1/formations-workflow")
public class FormationWorkflowController {

    private static final String KEY_ERROR = "error";
    private static final String KEY_MESSAGE = "message";
    private static final String MSG_ERREUR_INTERNE = "Erreur interne";

    @Autowired
    private ExportExcelService exportExcelService;

    @Autowired
    private FormationWorkflowService formationWorkflowService;

    @PostMapping
    public ResponseEntity<?> createFormation(@Valid @RequestBody FormationWorkflowRequest request, org.springframework.validation.BindingResult result) {
        if (result.hasErrors()) {
            log.error("Validation errors: {}", result.getAllErrors());
            return ResponseEntity.badRequest().body(result.getAllErrors());
        }
        Formation formation = formationWorkflowService.createFormationWorkflow(request);
        FormationDTO dto = formationWorkflowService.mapFormationToDTO(formation);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFormation(@PathVariable Long id, @Valid @RequestBody FormationWorkflowRequest request, org.springframework.validation.BindingResult result) {
        if (result.hasErrors()) {
            log.error("Validation errors for update: {}", result.getAllErrors());
            return ResponseEntity.badRequest().body(result.getAllErrors());
        }
        Formation formation = formationWorkflowService.updateFormationWorkflow(id, request);
        if (formation == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        FormationDTO dto = formationWorkflowService.mapFormationToDTO(formation);
        return ResponseEntity.ok(dto);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteFormation(@PathVariable Long id) {
        try {
            formationWorkflowService.deleteFormationWorkflow(id);
            return ResponseEntity.ok("Formation supprimée avec succès !");

        } catch (IllegalArgumentException e) {
            // Par exemple, si l'id n'existe pas => 400
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(KEY_ERROR, e.getMessage()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getFormationById(@PathVariable Long id) {
        try {
            FormationDTO dto = formationWorkflowService.getFormationWorkflowById(id);
            return ResponseEntity.ok(dto);

        } catch (IllegalArgumentException e) {
            // Formation non trouvée => 400 ou 404
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(KEY_ERROR, e.getMessage()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<Object> getAllFormations() {
        try {
            List<FormationDTO> dtos = formationWorkflowService.getAllFormationWorkflows();
            return ResponseEntity.ok(dtos);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @PutMapping("/presence/{id}")
    public ResponseEntity<Object> updatePresence(@PathVariable Long id,
                                            @RequestParam boolean present,
                                            @RequestParam String commentaire) {
        try {
            formationWorkflowService.updatePresence(id, present, commentaire);
            return ResponseEntity.ok("Présence mise à jour avec succès !");

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    @GetMapping("/export/excel")
    public ResponseEntity<Object> exportExcel(
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
                    KEY_ERROR, MSG_ERREUR_INTERNE,
                    KEY_MESSAGE, e.getMessage()
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
    public ResponseEntity<Object> getFormationsAchevees() {
        try {
            List<FormationDTO> achevees = formationWorkflowService.getFormationsAchevees();
            return ResponseEntity.ok(achevees);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
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

    @GetMapping("/par-departement")
    public List<FormationDTO> getFormationsParDepartement(@RequestParam String deptId) {
        return formationWorkflowService.getFormationsParDepartement(deptId);
    }
}
