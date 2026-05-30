package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.InscriptionDTO;
import esprit.pfe.serviceformation.dto.InscriptionSummaryDTO;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.FormationCompetenceRepository;
import esprit.pfe.serviceformation.repositories.InscriptionRepository;
import esprit.pfe.serviceformation.services.InscriptionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inscription")
public class InscriptionController {

    private final InscriptionService service;
    private final InscriptionRepository inscriptionRepository;
    private final FormationCompetenceRepository formationCompetenceRepository;

    public InscriptionController(InscriptionService s,
                                 InscriptionRepository inscriptionRepository,
                                 FormationCompetenceRepository formationCompetenceRepository) {
        this.service = s;
        this.inscriptionRepository = inscriptionRepository;
        this.formationCompetenceRepository = formationCompetenceRepository;
    }

    @GetMapping("/formations/accessibles")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getFormationsAccessibles(
            @RequestParam String enseignantId,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        return ResponseEntity.ok(service.listerFormationsAccessibles(enseignantId, pageable));
    }

    @PostMapping("/inscriptions")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_CREATE)
    public Inscription postInscription(
            @RequestParam Long formationId,
            @RequestParam String enseignantId) {
        return service.demanderInscription(formationId, enseignantId);
    }

    @GetMapping("/formations/{formationId}/inscriptions")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<InscriptionDTO>> getInscriptionsByFormation(
            @PathVariable Long formationId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(service.listerInscriptionsParFormation(formationId, pageable));
    }

    @PutMapping("/inscriptions/{id}/traiter")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_APPROVE)
    public Inscription traiter(
            @PathVariable Long id,
            @RequestParam boolean approuver) {
        return service.traiterDemande(id, approuver);
    }

    @GetMapping("/enseignant/{enseignantId}")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<InscriptionSummaryDTO>> getByEnseignant(
            @PathVariable String enseignantId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        Page<InscriptionSummaryDTO> result = inscriptionRepository
                .findByEnseignant_Id(enseignantId, pageable)
                .map(this::toSummary);
        return ResponseEntity.ok(result);
    }

    private InscriptionSummaryDTO toSummary(Inscription ins) {
        Formation f = ins.getFormation();
        List<String> competences = formationCompetenceRepository
                .findByFormationIdFormation(f.getIdFormation())
                .stream()
                .map(fc -> fc.getCompetenceNom() != null ? fc.getCompetenceNom() : String.valueOf(fc.getCompetenceId()))
                .toList();

        return InscriptionSummaryDTO.builder()
                .formationId(String.valueOf(f.getIdFormation()))
                .titreFormation(f.getTitreFormation())
                .dateDebut(f.getDateDebut() != null ? f.getDateDebut().toString() : "")
                .dateFin(f.getDateFin() != null ? f.getDateFin().toString() : "")
                .chargeHoraire(String.valueOf(f.getChargeHoraireGlobal()))
                .etatFormation(f.getEtatFormation() != null ? f.getEtatFormation().name() : "")
                .competencesCiblees(competences)
                .build();
    }
}
