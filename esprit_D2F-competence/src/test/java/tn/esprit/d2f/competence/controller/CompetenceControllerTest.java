package tn.esprit.d2f.competence.controller;

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
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.dto.CompetenceRequest;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.service.ICompetenceService;
import tn.esprit.d2f.competence.service.IEnseignantCompetenceService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompetenceController - Tests")
class CompetenceControllerTest {

    @Mock
    private ICompetenceService competenceService;

    @Mock
    private IEnseignantCompetenceService enseignantCompetenceService;

    @InjectMocks
    private CompetenceController competenceController;

    private CompetenceDTO competenceDTO;

    @BeforeEach
    void setUp() {
        competenceDTO = new CompetenceDTO();
        competenceDTO.setId(1L);
        competenceDTO.setCode("C1");
    }

    @Test
    void testGetAllCompetences() {
        Page<CompetenceDTO> page = new PageImpl<>(List.of(competenceDTO));
        when(competenceService.getAllCompetences(any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<CompetenceDTO>> response = competenceController.getAllCompetences(null, null, Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetCompetencesByDomaine() {
        when(competenceService.getCompetencesByDomaine(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(competenceDTO)));
        ResponseEntity<Page<CompetenceDTO>> response = competenceController.getCompetencesByDomaine(1L, Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testGetCompetenceById() {
        when(competenceService.getCompetenceById(1L)).thenReturn(competenceDTO);
        ResponseEntity<CompetenceDTO> response = competenceController.getCompetenceById(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testSearch() {
        Page<CompetenceDTO> page = new PageImpl<>(List.of(competenceDTO));
        when(competenceService.searchCompetences(anyString(), any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<CompetenceDTO>> response = competenceController.search("test", Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testCreateCompetence() {
        CompetenceRequest req = new CompetenceRequest();
        when(competenceService.createCompetence(eq(1L), any(CompetenceRequest.class))).thenReturn(competenceDTO);
        ResponseEntity<CompetenceDTO> response = competenceController.createCompetence(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void testUpdateCompetence() {
        CompetenceRequest req = new CompetenceRequest();
        when(competenceService.updateCompetence(eq(1L), any(CompetenceRequest.class))).thenReturn(competenceDTO);
        ResponseEntity<CompetenceDTO> response = competenceController.updateCompetence(1L, req);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void testDeleteCompetence() {
        ResponseEntity<Void> response = competenceController.deleteCompetence(1L);
        verify(competenceService, times(1)).deleteCompetence(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void testGetEnseignantsByCompetence() {
        EnseignantCompetenceDTO ecDTO = new EnseignantCompetenceDTO();
        when(enseignantCompetenceService.getByCompetenceId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(ecDTO)));
        ResponseEntity<Page<EnseignantCompetenceDTO>> response = competenceController.getEnseignantsByCompetence(1L, Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("getAllCompetences: avec upId non null appelle getCompetencesByFilter")
    void testGetAllCompetencesWithUpId() {
        Page<CompetenceDTO> page = new PageImpl<>(List.of(competenceDTO));
        when(competenceService.getCompetencesByFilter(eq("1"), isNull(), any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<CompetenceDTO>> response = competenceController.getAllCompetences("1", null, Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(competenceService).getCompetencesByFilter(eq("1"), isNull(), any(Pageable.class));
        verify(competenceService, never()).getAllCompetences(any(Pageable.class));
    }

    @Test
    @DisplayName("getAllCompetences: avec departementId non null appelle getCompetencesByFilter")
    void testGetAllCompetencesWithDepartementId() {
        Page<CompetenceDTO> page = new PageImpl<>(List.of(competenceDTO));
        when(competenceService.getCompetencesByFilter(isNull(), eq("2"), any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<CompetenceDTO>> response = competenceController.getAllCompetences(null, "2", Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(competenceService).getCompetencesByFilter(isNull(), eq("2"), any(Pageable.class));
    }

    @Test
    @DisplayName("getAllCompetences: avec upId et departementId appelle getCompetencesByFilter")
    void testGetAllCompetencesWithBothFilters() {
        Page<CompetenceDTO> page = new PageImpl<>(List.of(competenceDTO));
        when(competenceService.getCompetencesByFilter(eq("1"), eq("2"), any(Pageable.class))).thenReturn(page);
        ResponseEntity<Page<CompetenceDTO>> response = competenceController.getAllCompetences("1", "2", Pageable.unpaged());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(competenceService).getCompetencesByFilter(eq("1"), eq("2"), any(Pageable.class));
    }
}
