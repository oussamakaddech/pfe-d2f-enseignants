package esprit.pfe.serviceformation.Controllers;


import esprit.pfe.serviceformation.DTO.FormationDTO;
import esprit.pfe.serviceformation.DTO.InscriptionDTO;
import esprit.pfe.serviceformation.Entities.*;
import esprit.pfe.serviceformation.Services.InscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/inscription")
public class InscriptionController {

    private final InscriptionService service;

    public InscriptionController(InscriptionService s) {
        this.service = s;
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

    // 3. Lister les demandes en attente
    /*@GetMapping("/inscriptions/demandes")
    public List<Inscription> getDemandes(
            @RequestParam String userId,
            @RequestParam boolean isD2F) {
        return service.listerDemandes(userId, isD2F);
    }*/
    @GetMapping("/formations/{formationId}/inscriptions")
    public List<InscriptionDTO> getInscriptionsByFormation(@PathVariable Long formationId) {
        try {
            return service.listerInscriptionsParFormation(formationId);
        } catch (IllegalArgumentException ex) {
            // levé si la formation n'existe pas
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    ex.getMessage(),
                    ex
            );
        } catch (Exception ex) {
            // toute autre erreur inattendue
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur interne lors de la récupération des inscriptions",
                    ex
            );
        }
    }

    // 4. Approuver ou rejeter une demande
    @PutMapping("/inscriptions/{id}/traiter")
    public Inscription traiter(
            @PathVariable Long id,
            @RequestParam boolean approuver) {
        return service.traiterDemande(id, approuver);
    }
}
