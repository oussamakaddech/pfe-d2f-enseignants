package esprit.pfe.serviceformation.Controllers;


import esprit.pfe.serviceformation.Entities.Up;
import esprit.pfe.serviceformation.Repositories.UpRepository;
import esprit.pfe.serviceformation.Services.UpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/ups")

public class UpController {

    @Autowired
    private UpRepository upRepository;
    @Autowired
    private  UpService upService;
    @PostMapping("/import-excel")
    public ResponseEntity<String> importExcel(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Fichier vide");
        }
        try {
            upService.importUpsFromExcel(file);
            return ResponseEntity.ok("Import UP réussi");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Erreur import UP : " + e.getMessage());
        }
    }
    // Récupérer toutes les UP
    @GetMapping
    public ResponseEntity<List<Up>> getAllUp(){
        return ResponseEntity.ok(upRepository.findAll());
    }

    // Récupérer une UP par ID
    @GetMapping("/{id}")
    public ResponseEntity<Up> getUpById(@PathVariable String id){
        return ResponseEntity.ok(
                upRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("UP introuvable : " + id))
        );
    }

    // Ajouter une UP
    @PostMapping
    public ResponseEntity<Up> createUp(@RequestBody Up up){
        Up saved = upRepository.save(up);
        return ResponseEntity.ok(saved);
    }

    // Mettre à jour une UP
    @PutMapping("/{id}")
    public ResponseEntity<Up> updateUp(@PathVariable String id, @RequestBody Up up){
        Up existing = upRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UP introuvable : " + id));
        existing.setLibelle(up.getLibelle());
        Up updated = upRepository.save(existing);
        return ResponseEntity.ok(updated);
    }

    // Supprimer une UP
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUp(@PathVariable String id){
        upRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
