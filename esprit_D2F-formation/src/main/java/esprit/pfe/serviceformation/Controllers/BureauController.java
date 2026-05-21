package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.services.BureauService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bureaux")
@RequiredArgsConstructor
public class BureauController {

    private final BureauService bureauService;

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.BUREAU_READ)
    public ResponseEntity<List<Bureau>> getAllBureaux() {
        return ResponseEntity.ok(bureauService.getAllBureaux());
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.BUREAU_READ)
    public ResponseEntity<Bureau> getBureauById(@PathVariable Long id) {
        return ResponseEntity.ok(bureauService.getBureauById(id));
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.BUREAU_CREATE)
    public ResponseEntity<Bureau> createBureau(@Valid @RequestBody Bureau bureau) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bureauService.createBureau(bureau));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.BUREAU_UPDATE)
    public ResponseEntity<Bureau> updateBureau(@PathVariable Long id, @Valid @RequestBody Bureau bureau) {
        return ResponseEntity.ok(bureauService.updateBureau(id, bureau));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.BUREAU_DELETE)
    public ResponseEntity<Void> deleteBureau(@PathVariable Long id) {
        bureauService.deleteBureau(id);
        return ResponseEntity.noContent().build();
    }
}
