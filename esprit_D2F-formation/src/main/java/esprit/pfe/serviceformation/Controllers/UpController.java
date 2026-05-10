package esprit.pfe.serviceformation.controllers;


import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.repositories.UpRepository;
import esprit.pfe.serviceformation.services.UpService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ups")

@RequiredArgsConstructor
public class UpController {
    private final UpRepository upRepository;
    private final  UpService upService;
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
        return upRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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
        return upRepository.findById(id)
                .map(existing -> {
                    existing.setLibelle(up.getLibelle());
                    return ResponseEntity.ok(upRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Supprimer une UP
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUp(@PathVariable String id){
        upRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

