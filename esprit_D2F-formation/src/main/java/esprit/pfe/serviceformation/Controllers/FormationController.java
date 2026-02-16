package esprit.pfe.serviceformation.Controllers;


import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Services.FormationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/formations")
public class FormationController {

    @Autowired
    private FormationService formationService;

    // Création d'une formation
    @PostMapping
    public ResponseEntity<Formation> createFormation(@RequestBody Formation formation){
        Formation savedFormation = formationService.createFormation(formation);
        return ResponseEntity.ok(savedFormation);
    }

    // Récupération de toutes les formations
    @GetMapping
    public ResponseEntity<List<Formation>> getAllFormations(){
        return ResponseEntity.ok(formationService.getAllFormations());
    }

    // Récupération d'une formation par son id
    @GetMapping("/{id}")
    public ResponseEntity<Formation> getFormationById(@PathVariable Long id){
        return ResponseEntity.ok(formationService.getFormationById(id));
    }

    // Mise à jour d'une formation
    @PutMapping("/{id}")
    public ResponseEntity<Formation> updateFormation(@PathVariable Long id, @RequestBody Formation formation){
        Formation updatedFormation = formationService.updateFormation(id, formation);
        return ResponseEntity.ok(updatedFormation);
    }

    // Suppression d'une formation
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFormation(@PathVariable Long id){
        formationService.deleteFormation(id);
        return ResponseEntity.noContent().build();
    }

}
