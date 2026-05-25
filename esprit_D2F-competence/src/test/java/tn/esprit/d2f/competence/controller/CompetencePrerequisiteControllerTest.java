package tn.esprit.d2f.competence.controller;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.ICompetencePrerequisiteService;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompetencePrerequisiteController - Tests")
class CompetencePrerequisiteControllerTest {

    @Mock
    private ICompetencePrerequisiteService prerequisiteService;

    @InjectMocks
    private CompetencePrerequisiteController controller;

    private CompetencePrerequisiteDTO dto;

    @BeforeEach
    void setUp() {
        dto = new CompetencePrerequisiteDTO();
        dto.setId(1L);
    }

    @Test
    void testGetByCompetence() {
        when(prerequisiteService.getPrerequisitesByCompetence(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));
        ResponseEntity<Page<CompetencePrerequisiteDTO>> response = controller.getByCompetence(1L, Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testCheckEligibility() {
        Map<String, Object> details = Map.of("eligible", true);
        when(prerequisiteService.checkEnseignantEligibilityDetails(1L, "ens1")).thenReturn(details);
        ResponseEntity<Map<String, Object>> response = controller.checkEligibility(1L, "ens1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(details);
    }

    @Test
    void testAddPrerequisite() {
        CompetencePrerequisiteRequest req = new CompetencePrerequisiteRequest();
        when(prerequisiteService.addPrerequisite(eq(1L), any(CompetencePrerequisiteRequest.class))).thenReturn(dto);
        ResponseEntity<CompetencePrerequisiteDTO> response = controller.addPrerequisite(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testUpdateNiveau() {
        when(prerequisiteService.prerequisiteBelongsToCompetence(1L, 2L)).thenReturn(true);
        when(prerequisiteService.updateNiveauMinimum(2L, NiveauMaitrise.N3_INTERMEDIAIRE)).thenReturn(dto);
        
        ResponseEntity<CompetencePrerequisiteDTO> response = controller.updateNiveau(1L, 2L, NiveauMaitrise.N3_INTERMEDIAIRE);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testUpdateNiveauNotFound() {
        when(prerequisiteService.prerequisiteBelongsToCompetence(1L, 2L)).thenReturn(false);
        
        assertThatThrownBy(() -> controller.updateNiveau(1L, 2L, NiveauMaitrise.N1_DEBUTANT))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void testDeletePrerequisite() {
        when(prerequisiteService.prerequisiteBelongsToCompetence(1L, 2L)).thenReturn(true);
        
        ResponseEntity<Void> response = controller.deletePrerequisite(1L, 2L);
        
        verify(prerequisiteService, times(1)).removePrerequisite(2L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void testDeletePrerequisiteNotFound() {
        when(prerequisiteService.prerequisiteBelongsToCompetence(1L, 2L)).thenReturn(false);
        
        assertThatThrownBy(() -> controller.deletePrerequisite(1L, 2L))
            .isInstanceOf(EntityNotFoundException.class);
    }
}
