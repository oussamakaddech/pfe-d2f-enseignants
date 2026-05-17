package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.FormationDTO;
import esprit.pfe.serviceformation.dto.InscriptionDTO;
import esprit.pfe.serviceformation.dto.InscriptionSummaryDTO;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.FormationCompetenceRepository;
import esprit.pfe.serviceformation.repositories.InscriptionRepository;
import esprit.pfe.serviceformation.services.InscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

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

    // 1. Récupérer les formations ouvertes
    @GetMapping("/formations/accessibles")
    public List<FormationDTO> getFormationsAccessibles(
            @RequestParam String enseignantId) {
        return service.listerFormationsAccessibles(enseignantId);
    }

    // 2. Demander une inscription
    @PostMapping("/inscriptions")
    public Inscription postInscription(
            @RequestParam Long formationId,
            @RequestParam String enseignantId) {
        return service.demanderInscription(formationId, enseignantId);
    }

    // 3. Lister les inscriptions par formation
    @GetMapping("/formations/{formationId}/inscriptions")
    public List<InscriptionDTO> getInscriptionsByFormation(@PathVariable Long formationId) {
        try {
            return service.listerInscriptionsParFormation(formationId);
        } catch (IllegalArgumentException ex) {
            // levé si la formation n'existe pas
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    ex.getMessage(),
                    ex);
        } catch (Exception ex) {
            // toute autre erreur inattendue
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur interne lors de la récupération des inscriptions",
                    ex);
        }
    }

    // 4. Approuver ou rejeter une demande
    @PutMapping("/inscriptions/{id}/traiter")
    public Inscription traiter(
            @PathVariable Long id,
            @RequestParam boolean approuver) {
        return service.traiterDemande(id, approuver);
    }

    /**
     * Retourne le résumé des formations suivies par un enseignant.
     * Utilisé par le Skill Passport (service-analyse) pour agréger le profil.
     * Accessible à tout utilisateur authentifié.
     *
     * Contrat stable : GET /api/v1/inscription/enseignant/{enseignantId}
     */
    @GetMapping("/enseignant/{enseignantId}")
    public ResponseEntity<List<InscriptionSummaryDTO>> getByEnseignant(
            @PathVariable String enseignantId) {
        List<InscriptionSummaryDTO> result = inscriptionRepository
                .findByEnseignant_Id(enseignantId)
                .stream()
                .map(this::toSummary)
                .toList();
        return ResponseEntity.ok(result);
    }

    private InscriptionSummaryDTO toSummary(Inscription ins) {
        Formation f = ins.getFormation();
        List<String> competences = formationCompetenceRepository
                .findByFormationIdFormation(f.getIdFormation())
                .stream()
                .map(fc -> fc.getCompetenceNom() != null ? fc.getCompetenceNom() : String.valueOf(fc.getCompetenceId()))
                .collect(Collectors.toList());

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
