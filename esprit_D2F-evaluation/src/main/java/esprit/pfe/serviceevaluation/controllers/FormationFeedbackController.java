package esprit.pfe.serviceevaluation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackRequest;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackStatsDTO;
import esprit.pfe.serviceevaluation.services.FormationFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Questionnaire de satisfaction des formations (participants) et statistiques
 * anonymes (administration).
 */
@RestController
@RequestMapping("/api/v1/formation-feedback")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Questionnaire de satisfaction",
        description = "Évaluation des formations par les participants et statistiques.")
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name = "bearerAuth")
public class FormationFeedbackController {

    private final FormationFeedbackService service;

    private static String email(Jwt jwt) {
        if (jwt == null) return null;
        String email = jwt.getClaimAsString("email");
        return email != null && !email.isBlank() ? email : jwt.getSubject();
    }

    /** Envoi de la réponse (participant de la formation, une seule fois). */
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.EVALUATION_CREATE)
    public ResponseEntity<Map<String, Object>> submit(@AuthenticationPrincipal Jwt jwt,
                                                      @Valid @RequestBody FormationFeedbackRequest request) {
        var saved = service.submit(email(jwt), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("id", saved.getId(), "formationId", saved.getFormationId()));
    }

    /** Identifiants des formations déjà évaluées par l'utilisateur connecté. */
    @GetMapping("/mine")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_CREATE)
    public ResponseEntity<List<Long>> mine(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.formationsEvaluees(email(jwt)));
    }

    /** Statistiques anonymes : toutes formations, ou une seule ({@code formationId}). */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormationFeedbackStatsDTO> stats(@RequestParam(required = false) Long formationId) {
        return ResponseEntity.ok(service.stats(formationId));
    }

    /** Réponses individuelles anonymes (export Excel de l'administration). */
    @GetMapping("/reponses")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<FormationFeedbackStatsDTO.Reponse>> reponses(@RequestParam(required = false) Long formationId) {
        return ResponseEntity.ok(service.reponses(formationId));
    }

    /** Éligibilité aux certificats (appel du service formation, jeton de service). */
    @GetMapping("/submitted/{formationId}/{participantId}")
    @PreAuthorize("hasAnyRole('SVC_FORMATION','ADMIN')")
    public ResponseEntity<Boolean> submitted(@PathVariable Long formationId, @PathVariable String participantId) {
        return ResponseEntity.ok(service.isSubmitted(formationId, participantId));
    }
}
