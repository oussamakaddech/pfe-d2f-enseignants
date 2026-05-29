package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.SeanceDTO;
import esprit.pfe.serviceformation.services.SeanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

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
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
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
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<SeanceDTO>> getAllSeances(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        try {
            return ResponseEntity.ok(seanceService.getAllSeances(pageable));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // READ BY ID
    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
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
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
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
    @PreAuthorize(AuthorizationMatrix.FORMATION_DELETE)
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

