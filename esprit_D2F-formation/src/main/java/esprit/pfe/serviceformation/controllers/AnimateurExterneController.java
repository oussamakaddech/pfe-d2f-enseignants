package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.AnimateurExterneDTO;
import esprit.pfe.serviceformation.dto.AnimateurExterneRequest;
import esprit.pfe.serviceformation.dto.ReferentialMapper;
import esprit.pfe.serviceformation.services.AnimateurExterneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/bureaux/{bureauId}/animateurs")
@RequiredArgsConstructor
public class AnimateurExterneController {

    private final AnimateurExterneService animateurService;

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.ANIMATEUR_EXTERNE_READ)
    public ResponseEntity<Page<AnimateurExterneDTO>> getByBureau(
            @PathVariable Long bureauId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(animateurService.getByBureau(bureauId, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.ANIMATEUR_EXTERNE_READ)
    public ResponseEntity<AnimateurExterneDTO> getById(@PathVariable Long bureauId, @PathVariable Long id) {
        return ResponseEntity.ok(ReferentialMapper.toAnimateurExterneDTO(animateurService.getById(bureauId, id)));
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.ANIMATEUR_EXTERNE_CREATE)
    public ResponseEntity<AnimateurExterneDTO> create(
            @PathVariable Long bureauId, @Valid @RequestBody AnimateurExterneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ReferentialMapper.toAnimateurExterneDTO(animateurService.create(bureauId, request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.ANIMATEUR_EXTERNE_UPDATE)
    public ResponseEntity<AnimateurExterneDTO> update(
            @PathVariable Long bureauId, @PathVariable Long id, @Valid @RequestBody AnimateurExterneRequest request) {
        return ResponseEntity.ok(ReferentialMapper.toAnimateurExterneDTO(animateurService.update(bureauId, id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.ANIMATEUR_EXTERNE_DELETE)
    public ResponseEntity<Void> delete(@PathVariable Long bureauId, @PathVariable Long id) {
        animateurService.delete(bureauId, id);
        return ResponseEntity.noContent().build();
    }
}
