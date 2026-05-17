package esprit.pfe.serviceanalyse.controllers;

import esprit.pfe.serviceanalyse.dto.passport.TeacherSkillPassportDTO;
import esprit.pfe.serviceanalyse.service.passport.SkillPassportAssembler;
import esprit.pfe.serviceanalyse.service.passport.SkillPassportAuthorizationService;
import esprit.pfe.serviceanalyse.service.passport.SkillPassportPdfGenerator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * API REST du Passeport de Compétences.
 *
 * Règles RBAC :
 *   ADMIN / CUP / D2F → accès à tous les passeports
 *   ENSEIGNANT         → accès à son propre passeport uniquement
 *
 * Endpoints :
 *   GET /api/v1/skill-passports/me                           → PDF de l'enseignant connecté
 *   GET /api/v1/skill-passports/teacher/{username}          → PDF d'un enseignant (admin/CUP)
 *   GET /api/v1/skill-passports/teacher/{username}/json     → JSON (debug / intégration)
 */
@Tag(name = "Passeport de Compétences", description = "Génération et consultation du Skill Passport enseignant")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/skill-passports")
@RequiredArgsConstructor
@Slf4j
public class SkillPassportController {

    private final SkillPassportAssembler assembler;
    private final SkillPassportPdfGenerator pdfGenerator;
    private final SkillPassportAuthorizationService authorizationService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    // ────────────────────────────────────────────────────────────────────
    //  GET /me → PDF de l'enseignant connecté
    // ────────────────────────────────────────────────────────────────────
    @Operation(
        summary = "Télécharger mon passeport PDF",
        description = "Génère et retourne le Passeport de Compétences de l'utilisateur authentifié au format PDF. "
            + "Accessible à tout utilisateur authentifié (ENSEIGNANT, ADMIN, CUP, D2F)."
    )
    @ApiResponse(responseCode = "200", description = "PDF généré avec succès",
        content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE,
            schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "401", description = "Token JWT absent ou expiré",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "403", description = "Accès refusé — rôle insuffisant",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "500", description = "Erreur interne lors de la génération du PDF",
        content = @Content(schema = @Schema(hidden = true)))
    @Parameter(name = "Authorization", in = ParameterIn.HEADER, required = true,
        description = "JWT Bearer token (ex: Bearer eyJ...)",
        schema = @Schema(type = "string"))
    @GetMapping(value = "/me", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> getMyPassport(
            Authentication authentication,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {

        String username = authorizationService.extractUsername(authentication);
        log.info("Génération passeport PDF pour l'enseignant connecté : {}", username);

        TeacherSkillPassportDTO passport = assembler.assemble(username, bearerToken);
        byte[] pdf = pdfGenerator.generate(passport);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"skill-passport-" + username + "-" + LocalDate.now().format(DATE_FMT) + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ────────────────────────────────────────────────────────────────────
    //  GET /teacher/{username} → PDF d'un enseignant cible
    // ────────────────────────────────────────────────────────────────────
    @Operation(
        summary = "Télécharger le passeport PDF d'un enseignant",
        description = "Génère le Passeport de Compétences d'un enseignant cible. "
            + "ADMIN, CUP et D2F peuvent accéder à n'importe quel passeport. "
            + "Un ENSEIGNANT ne peut accéder qu'au sien (username doit correspondre au sub JWT)."
    )
    @ApiResponse(responseCode = "200", description = "PDF généré",
        content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE,
            schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "401", description = "Token JWT absent ou expiré",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "403", description = "Accès refusé — rôle insuffisant ou username différent du sub JWT",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "404", description = "Enseignant introuvable dans le service d'authentification",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "500", description = "Erreur interne lors de la génération du PDF",
        content = @Content(schema = @Schema(hidden = true)))
    @GetMapping(value = "/teacher/{username}", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> getPassportByUsername(
            @Parameter(description = "Username de l'enseignant cible", required = true, in = ParameterIn.PATH)
            @PathVariable String username,
            Authentication authentication,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {

        authorizationService.checkAccess(authentication, username);
        log.info("Génération passeport PDF pour enseignant={} par {}", username, authentication.getName());

        TeacherSkillPassportDTO passport = assembler.assemble(username, bearerToken);
        byte[] pdf = pdfGenerator.generate(passport);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"skill-passport-" + username + "-" + LocalDate.now().format(DATE_FMT) + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ────────────────────────────────────────────────────────────────────
    //  GET /teacher/{username}/json → Données JSON (debug / frontend)
    // ────────────────────────────────────────────────────────────────────
    @Operation(
        summary = "Obtenir les données du passeport au format JSON",
        description = "Retourne le TeacherSkillPassportDTO sérialisé. "
            + "Mêmes règles RBAC que GET /teacher/{username}. "
            + "Utilisé par le frontend pour afficher le tableau de bord du passeport."
    )
    @ApiResponse(responseCode = "200", description = "Données JSON du passeport",
        content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(implementation = TeacherSkillPassportDTO.class)))
    @ApiResponse(responseCode = "401", description = "Token JWT absent ou expiré",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "403", description = "Accès refusé — rôle insuffisant ou username différent du sub JWT",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "404", description = "Enseignant introuvable",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "500", description = "Erreur interne",
        content = @Content(schema = @Schema(hidden = true)))
    @GetMapping(value = "/teacher/{username}/json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TeacherSkillPassportDTO> getPassportJson(
            @Parameter(description = "Username de l'enseignant cible", required = true, in = ParameterIn.PATH)
            @PathVariable String username,
            Authentication authentication,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {

        authorizationService.checkAccess(authentication, username);
        log.info("Données JSON passeport pour enseignant={}", username);

        TeacherSkillPassportDTO passport = assembler.assemble(username, bearerToken);
        return ResponseEntity.ok(passport);
    }

    // ────────────────────────────────────────────────────────────────────
    //  GET /me/json → JSON de l'enseignant connecté
    // ────────────────────────────────────────────────────────────────────
    @Operation(
        summary = "Données JSON de mon passeport",
        description = "Retourne le TeacherSkillPassportDTO de l'utilisateur authentifié. "
            + "Accessible à tout utilisateur authentifié (ENSEIGNANT, ADMIN, CUP, D2F)."
    )
    @ApiResponse(responseCode = "200", description = "Données JSON du passeport",
        content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(implementation = TeacherSkillPassportDTO.class)))
    @ApiResponse(responseCode = "401", description = "Token JWT absent ou expiré",
        content = @Content(schema = @Schema(hidden = true)))
    @ApiResponse(responseCode = "500", description = "Erreur interne",
        content = @Content(schema = @Schema(hidden = true)))
    @Parameter(name = "Authorization", in = ParameterIn.HEADER, required = true,
        description = "JWT Bearer token (ex: Bearer eyJ...)",
        schema = @Schema(type = "string"))
    @GetMapping(value = "/me/json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TeacherSkillPassportDTO> getMyPassportJson(
            Authentication authentication,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {

        String username = authorizationService.extractUsername(authentication);
        TeacherSkillPassportDTO passport = assembler.assemble(username, bearerToken);
        return ResponseEntity.ok(passport);
    }
}
