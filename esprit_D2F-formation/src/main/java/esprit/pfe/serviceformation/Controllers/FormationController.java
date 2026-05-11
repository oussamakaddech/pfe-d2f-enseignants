package esprit.pfe.serviceformation.controllers;


import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.services.FormationService;
import esprit.pfe.auth.security.AuthorizationMatrix;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/formations")
@RequiredArgsConstructor
public class FormationController {
    private final FormationService formationService;

    // Création d'une formation - ADMIN, CUP only
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_CREATE)
    public ResponseEntity<Formation> createFormation(@RequestBody Formation formation){
        Formation savedFormation = formationService.createFormation(formation);
        return ResponseEntity.ok(savedFormation);
    }

    // Récupération de toutes les formations - All authenticated users (paginé)
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<Formation>> getAllFormations(Pageable pageable){
        return ResponseEntity.ok(formationService.getAllFormations(pageable));
    }

    // Récupération d'une formation par son id
    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Formation> getFormationById(@PathVariable Long id){
        return ResponseEntity.ok(formationService.getFormationById(id));
    }

    // Mise à jour d'une formation - ADMIN, CUP only
    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<Formation> updateFormation(@PathVariable Long id, @RequestBody Formation formation){
        Formation updatedFormation = formationService.updateFormation(id, formation);
        return ResponseEntity.ok(updatedFormation);
    }

    // Suppression d'une formation - ADMIN only
    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_DELETE)
    public ResponseEntity<Void> deleteFormation(@PathVariable Long id){
        formationService.deleteFormation(id);
        return ResponseEntity.noContent().build();
    }

}

