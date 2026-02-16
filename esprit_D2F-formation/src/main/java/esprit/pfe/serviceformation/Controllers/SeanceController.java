package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.DTO.SeanceDTO;
import esprit.pfe.serviceformation.Services.SeanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/seances")
public class SeanceController {

    @Autowired
    private SeanceService seanceService;

    // CREATE
    @PostMapping
    public ResponseEntity<?> createSeance(@RequestBody SeanceDTO dto) {
        try {
            SeanceDTO created = seanceService.createSeance(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            // Conflit horaire
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    // READ ALL
    @GetMapping
    public ResponseEntity<List<SeanceDTO>> getAllSeances() {
        try {
            List<SeanceDTO> list = seanceService.getAllSeances();
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // READ BY ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getSeanceById(@PathVariable Long id) {
        try {
            SeanceDTO dto = seanceService.getSeanceById(id);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSeance(@PathVariable Long id, @RequestBody SeanceDTO dto) {
        try {
            SeanceDTO updated = seanceService.updateSeance(id, dto);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            // Conflit horaire
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSeance(@PathVariable Long id) {
        try {
            seanceService.deleteSeance(id);
            return ResponseEntity.ok("Séance supprimée avec succès !");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur interne", "message", e.getMessage()));
        }
    }
}
