package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.DTO.EnseignantDTO;
import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Services.EnseignantExcelService;
import esprit.pfe.serviceformation.Services.EnseignantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/enseignants")
// Autorise les requêtes depuis le front React (si nécessaire)
public class EnseignantController {
    @Autowired
    private EnseignantExcelService excelService;
    @Autowired
    private EnseignantService enseignantService;

    // Récupérer la liste de tous les enseignants
    @GetMapping
    public ResponseEntity<List<EnseignantDTO>> getAllEnseignants(){
        return ResponseEntity.ok(enseignantService.getAllEnseignantsDTO());
    }

    // Récupérer un enseignant par ID
    @GetMapping("/{id}")
    public ResponseEntity<Enseignant> getEnseignantById(@PathVariable String id){
        return ResponseEntity.ok(enseignantService.getEnseignantById(id));
    }

    // Ajouter un enseignant
    @PostMapping
    public ResponseEntity<Enseignant> createEnseignant(@RequestBody Enseignant enseignant){
        Enseignant saved = enseignantService.createEnseignant(enseignant);
        return ResponseEntity.ok(saved);
    }

    // Mettre à jour un enseignant
    @PutMapping("/{id}")
    public ResponseEntity<Enseignant> updateEnseignant(@PathVariable String id, @RequestBody Enseignant enseignant){
        Enseignant updated = enseignantService.updateEnseignant(id, enseignant);
        return ResponseEntity.ok(updated);
    }

    // Supprimer un enseignant
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEnseignant(@PathVariable String id){
        enseignantService.deleteEnseignant(id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/upload")
    public ResponseEntity<String> uploadEnseignants(@RequestParam("file") MultipartFile file) {
        try {
            excelService.importEnseignantsFromExcel(file);
            return ResponseEntity.ok("Import des enseignants réussi !");
        } catch (Exception e) {
            // Vous pouvez affiner le code HTTP selon le type d’erreur
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Erreur lors de l’import : " + e.getMessage());
        }
    }
}
