package esprit.pfe.serviceformation.Controllers;


import esprit.pfe.serviceformation.Entities.Dept;
import esprit.pfe.serviceformation.Repositories.DeptRepository;
import esprit.pfe.serviceformation.Services.DeptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/departements")

public class DeptController {

    @Autowired
    private DeptRepository deptRepository;
    @Autowired
    private DeptService deptService;
    // Récupérer tous les départements
    @PostMapping("/import-excel")
    public ResponseEntity<String> importExcel(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Fichier vide");
        }
        try {
            deptService.importDeptsFromExcel(file);
            return ResponseEntity.ok("Import Dept réussi");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Erreur import Dept : " + e.getMessage());
        }
    }
    @GetMapping
    public ResponseEntity<List<Dept>> getAllDept(){
        return ResponseEntity.ok(deptRepository.findAll());
    }

    // Récupérer un département par ID
    @GetMapping("/{id}")
    public ResponseEntity<Dept> getDeptById(@PathVariable String id){
        return ResponseEntity.ok(
                deptRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("Département introuvable : " + id))
        );
    }

    // Ajouter un département
    @PostMapping
    public ResponseEntity<Dept> createDept(@RequestBody Dept dept){
        Dept saved = deptRepository.save(dept);
        return ResponseEntity.ok(saved);
    }

    // Mettre à jour un département
    @PutMapping("/{id}")
    public ResponseEntity<Dept> updateDept(@PathVariable String id, @RequestBody Dept dept){
        Dept existing = deptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Département introuvable : " + id));
        existing.setLibelle(dept.getLibelle());
        Dept updated = deptRepository.save(existing);
        return ResponseEntity.ok(updated);
    }

    // Supprimer un département
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDept(@PathVariable String id){
        deptRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
