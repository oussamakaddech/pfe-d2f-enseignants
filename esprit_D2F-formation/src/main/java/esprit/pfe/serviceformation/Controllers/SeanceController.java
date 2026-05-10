package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.services.SeanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/seances")
@RequiredArgsConstructor
public class SeanceController {

    private final SeanceService seanceService;

    private static final String KEY_ERROR = "error";
    private static final String KEY_MESSAGE = "message";
    private static final String MSG_ERREUR_INTERNE = "Erreur interne";

    // CREATE
    @PostMapping
    public ResponseEntity<Object> createSeance(@RequestBody SeanceDTO dto) {
        try {
            SeanceDTO created = seanceService.createSeance(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            // Conflit horaire
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
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
    public ResponseEntity<Object> getSeanceById(@PathVariable Long id) {
        try {
            SeanceDTO dto = seanceService.getSeanceById(id);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Object> updateSeance(@PathVariable Long id, @RequestBody SeanceDTO dto) {
        try {
            SeanceDTO updated = seanceService.updateSeance(id, dto);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            // Conflit horaire
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (RuntimeException e) {
            // Vérifier si c'est une erreur interne personnalisée
            try {
                Class<?> internalErrorException = Class.forName("esprit.pfe.serviceformation.controllers.InternalErrorException");
                if (internalErrorException.isInstance(e)) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of(KEY_ERROR, e.getMessage()));
                }
            } catch (ClassNotFoundException ex) {
                // Si la classe n'existe pas, continuer avec le traitement normal
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteSeance(@PathVariable Long id) {
        try {
            seanceService.deleteSeance(id);
            return ResponseEntity.ok("Séance supprimée avec succès !");
        } catch (RuntimeException e) {
            // Vérifier si c'est une erreur interne personnalisée
            try {
                Class<?> internalErrorException = Class.forName("esprit.pfe.serviceformation.controllers.InternalErrorException");
                if (internalErrorException.isInstance(e)) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of(KEY_ERROR, e.getMessage()));
                }
            } catch (ClassNotFoundException ex) {
                // Si la classe n'existe pas, continuer avec le traitement normal
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }
}

