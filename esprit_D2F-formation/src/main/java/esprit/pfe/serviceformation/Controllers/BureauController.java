package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.BureauDTO;
import esprit.pfe.serviceformation.dto.ReferentialMapper;
import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.services.BureauService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/v1/bureaux")
@RequiredArgsConstructor
public class BureauController {

    private final BureauService bureauService;

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.BUREAU_READ)
    public ResponseEntity<Page<BureauDTO>> getAllBureaux(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(bureauService.getAllBureaux(pageable).map(ReferentialMapper::toBureauDTO));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.BUREAU_READ)
    public ResponseEntity<BureauDTO> getBureauById(@PathVariable Long id) {
        return ResponseEntity.ok(ReferentialMapper.toBureauDTO(bureauService.getBureauById(id)));
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.BUREAU_CREATE)
    public ResponseEntity<BureauDTO> createBureau(@Valid @RequestBody Bureau bureau) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ReferentialMapper.toBureauDTO(bureauService.createBureau(bureau)));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.BUREAU_UPDATE)
    public ResponseEntity<BureauDTO> updateBureau(@PathVariable Long id, @Valid @RequestBody Bureau bureau) {
        return ResponseEntity.ok(ReferentialMapper.toBureauDTO(bureauService.updateBureau(id, bureau)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.BUREAU_DELETE)
    public ResponseEntity<Void> deleteBureau(@PathVariable Long id) {
        bureauService.deleteBureau(id);
        return ResponseEntity.noContent().build();
    }
}
