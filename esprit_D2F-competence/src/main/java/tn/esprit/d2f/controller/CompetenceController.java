package tn.esprit.d2f.controller;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.clients.NiveauClient;
import tn.esprit.d2f.clients.SavoirClient;
import tn.esprit.d2f.entity.*;
import tn.esprit.d2f.clients.DomaineClient;
import tn.esprit.d2f.repository.CompetenceRepository;
import tn.esprit.d2f.service.CompetenceServiceImpl;
import tn.esprit.d2f.service.ICompetenceService;

import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@AllArgsConstructor
@RequestMapping("/competences")
public class CompetenceController {
    @Autowired
    ICompetenceService competenceService ;
    @Autowired
    DomaineClient domaineClient ;
    @Autowired
    NiveauClient niveauClient ;
    @Autowired
    SavoirClient savoirClient ;
    @Autowired
    CompetenceRepository competenceRepository ;
    @Autowired
    CompetenceServiceImpl service ;


    @GetMapping("/retrieve-all-Competences")
    public List<Competence> getCompetences() {
        List<Competence> listCompetences = competenceService.retrieveAllCompetences() ;
        return listCompetences ;
    }

    @GetMapping("/retrieve-Competence/{idCompetence}")
    public Competence retrieveCompetence(@PathVariable("idCompetence") long idCompetence) {
        Competence  Competence=competenceService.retrieveCompetence(idCompetence) ;
        return Competence ;
    }


    @PostMapping("/add-Competence")
    public Competence addCompetence(@RequestBody Competence c) {
        Competence Competence=competenceService.addCompetence(c) ;
        return Competence ;
    }

    @DeleteMapping("/remove-Competence/{idCompetence}")
    public void removeCompetence(@PathVariable("idCompetence") long idCompetence) {
        competenceService.removeCompetence(idCompetence);
    }

    @PutMapping("/modify-Competence")
    public Competence modifyCompetence(@RequestBody Competence c) {
        Competence Competence=competenceService.modifyCompetence(c) ;
        return Competence ;
    }

    @PostMapping("/affectDomaineToCompetence/{competenceId}/domaine/{domaineId}")
    public ResponseEntity<Competence> affecterDomaine(@PathVariable Long competenceId, @PathVariable Long domaineId) {

        Competence competence = competenceService.retrieveCompetence(competenceId);
        competence.setDomaineId(domaineId);
        competenceService.addCompetence(competence);

        return ResponseEntity.ok(competence);
    }
    @PostMapping("/affectNiveauToCompetence/{competenceId}/niveau/{niveauId}")
    public ResponseEntity<Competence> affecterNiveau(@PathVariable Long competenceId, @PathVariable Long niveauId) {

        Competence competence = competenceService.retrieveCompetence(competenceId);
        competence.setNiveauId(niveauId);
        competenceService.addCompetence(competence);

        return ResponseEntity.ok(competence);
    }
    @PostMapping("/affectSavoirsToCompetence/{competenceId}/savoirs")
    public ResponseEntity<Competence> affecterSavoirs(@PathVariable Long competenceId, @RequestBody List<Long> savoirIds) {
        Competence competence = competenceService.retrieveCompetence(competenceId);
        competence.setSavoirIds(savoirIds);
        competenceService.addCompetence(competence);

        return ResponseEntity.ok(competence);
    }

    @GetMapping("/{competenceId}/savoirs")
    public ResponseEntity<List<Long>> getSavoirsByCompetence(@PathVariable Long competenceId) {
        Optional<Competence> competenceOpt = competenceRepository.findById(competenceId);
        if (competenceOpt.isPresent()) {
            Competence competence = competenceOpt.get();
            List<Long> savoirIds = competence.getSavoirIds();
            return ResponseEntity.ok(savoirIds);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping(value = "/getCompetenceWithAffectations/{id}", produces = "application/json")
    @ResponseBody
    public ResponseEntity<CompetenceDTO> getCompetenceWithAffectations(@PathVariable Long id) {
        Competence competence = competenceService.retrieveCompetence(id);

        if (competence == null) {
            return ResponseEntity.notFound().build();
        }

        DomaineDTO domaine = domaineClient.retrieveDomaine(competence.getDomaineId());
        NiveauDTO niveau = niveauClient.retrieveNiveau(competence.getNiveauId()) ;


        CompetenceDTO competenceDTO = new CompetenceDTO(
                competence.getIdCompetence(),
                competence.getNomCompetence(),
                competence.getDescriptionCompetence(),
                domaine ,
                niveau
        );


        return ResponseEntity.ok(competenceDTO);
    }

    @PostMapping("/affecter/{savoirId}/to/savoirs")
    public ResponseEntity<String> affecter(@PathVariable Long savoirId, @RequestBody List<Long> competenceIds) {
        service.affecterSavoirsACompetence(savoirId, competenceIds);
        return ResponseEntity.ok("savoir affecté via JMS !");
    }

    @GetMapping("/findByIds")
    public ResponseEntity<List<Competence>> getCompetencesByIds(@RequestParam List<Long> ids) {
        List<Competence> competences = competenceRepository.findAllByIdCompetenceIn(ids);
        if (competences.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(competences);
    }



}
