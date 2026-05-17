package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.CompetencePrerequisite;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.exception.BusinessException;
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompetencePrerequisiteServiceImpl - Validation")
class CompetencePrerequisiteServiceImplTest {

    @Mock
    private CompetencePrerequisiteRepository prerequisiteRepository;

    @Mock
    private CompetenceRepository competenceRepository;

    @Mock
    private EnseignantCompetenceRepository enseignantCompetenceRepository;

    @InjectMocks
    private CompetencePrerequisiteServiceImpl service;

    @Test
    @DisplayName("rejects null prerequisiteId before persistence")
    void shouldRejectNullPrerequisiteId() {
        CompetencePrerequisiteRequest request = CompetencePrerequisiteRequest.builder()
                .prerequisiteId(null)
                .niveauMinimum(NiveauMaitrise.N2_ELEMENTAIRE)
                .description("React necessite les bases frontend")
                .build();

        assertThatThrownBy(() -> service.addPrerequisite(264L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("prerequisiteId");

        verify(prerequisiteRepository, never()).save(any(CompetencePrerequisite.class));
    }

    @Test
    @DisplayName("rejects null niveauMinimum before persistence")
    void shouldRejectNullNiveauMinimum() {
        CompetencePrerequisiteRequest request = CompetencePrerequisiteRequest.builder()
                .prerequisiteId(10L)
                .niveauMinimum(null)
                .description("Niveau requis")
                .build();

        assertThatThrownBy(() -> service.addPrerequisite(264L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("niveauMinimum");

        verify(prerequisiteRepository, never()).save(any(CompetencePrerequisite.class));
    }

    @Test
    @DisplayName("creates prerequisite when payload is valid")
    void shouldCreatePrerequisiteWhenValid() {
        Long competenceId = 264L;
        Long prerequisiteId = 42L;

        CompetencePrerequisiteRequest request = CompetencePrerequisiteRequest.builder()
                .prerequisiteId(prerequisiteId)
                .niveauMinimum(NiveauMaitrise.N2_ELEMENTAIRE)
                .description("React necessite les bases frontend")
                .build();

        Competence competence = Competence.builder()
                .id(competenceId)
                .nom("React")
                .code("WEB-REACT")
                .build();

        Competence prerequisite = Competence.builder()
                .id(prerequisiteId)
                .nom("Frontend")
                .code("WEB-FRONT")
                .build();

        CompetencePrerequisite saved = CompetencePrerequisite.builder()
                .id(1L)
                .competence(competence)
                .prerequisite(prerequisite)
                .niveauMinimum(NiveauMaitrise.N2_ELEMENTAIRE)
                .description("React necessite les bases frontend")
                .build();

        when(prerequisiteRepository.existsByCompetenceIdAndPrerequisiteId(competenceId, prerequisiteId)).thenReturn(false);
        when(prerequisiteRepository.findPrerequisiteIdsByCompetenceId(prerequisiteId)).thenReturn(List.of());
        when(competenceRepository.findById(competenceId)).thenReturn(Optional.of(competence));
        when(competenceRepository.findById(prerequisiteId)).thenReturn(Optional.of(prerequisite));
        when(prerequisiteRepository.save(any(CompetencePrerequisite.class))).thenReturn(saved);

        CompetencePrerequisiteDTO dto = service.addPrerequisite(competenceId, request);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getPrerequisiteId()).isEqualTo(prerequisiteId);
        verify(prerequisiteRepository).save(any(CompetencePrerequisite.class));
    }

    @Test
    @DisplayName("getPrerequisitesByCompetence: returns list with labels")
    void shouldReturnPrerequisites() {
        Long compId = 1L;
        CompetencePrerequisiteDTO cpDTO = CompetencePrerequisiteDTO.builder()
                .id(1L)
                .competenceId(compId)
                .competenceNom("C1")
                .prerequisiteId(2L)
                .prerequisiteNom("P1")
                .prerequisiteCode("P1")
                .niveauMinimum(NiveauMaitrise.N2_ELEMENTAIRE)
                .build();
        
        when(competenceRepository.existsById(compId)).thenReturn(true);
        when(prerequisiteRepository.findByCompetenceId(compId)).thenReturn(List.of(cpDTO));

        List<CompetencePrerequisiteDTO> result = service.getPrerequisitesByCompetence(compId);
        
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNiveauMinimumLabel()).isEqualTo("N2 - Elementaire");
    }

    @Test
    @DisplayName("checkEnseignantEligibilityDetails: returns details of satisfaction")
    void shouldCheckEligibilityDetails() {
        Long compId = 1L;
        String ensId = "ens1";
        
        CompetencePrerequisiteDTO cpDTO = CompetencePrerequisiteDTO.builder()
                .id(1L)
                .competenceId(compId)
                .competenceNom("C1")
                .prerequisiteId(2L)
                .prerequisiteNom("P1")
                .prerequisiteCode("P1")
                .niveauMinimum(NiveauMaitrise.N3_INTERMEDIAIRE)
                .build();
        
        when(competenceRepository.existsById(compId)).thenReturn(true);
        when(prerequisiteRepository.findByCompetenceId(compId)).thenReturn(List.of(cpDTO));
        
        EnseignantCompetence ec = mock(EnseignantCompetence.class);
        when(ec.getNiveau()).thenReturn(NiveauMaitrise.N2_ELEMENTAIRE); // Under minimum
        when(enseignantCompetenceRepository.findByEnseignantIdAndCompetenceId(ensId, 2L)).thenReturn(List.of(ec));

        Map<String, Object> result = service.checkEnseignantEligibilityDetails(compId, ensId);
        
        assertThat(result).containsEntry("eligible", false);
        assertThat((List<?>)result.get("prerequisitesManquants")).hasSize(1);
    }

    @Test
    @DisplayName("updateNiveauMinimum: updates correctly")
    void shouldUpdateNiveau() {
        CompetencePrerequisite cp = mock(CompetencePrerequisite.class);
        Competence c = Competence.builder().id(1L).nom("C1").build();
        Competence p = Competence.builder().id(2L).nom("P1").build();
        when(cp.getCompetence()).thenReturn(c);
        when(cp.getPrerequisite()).thenReturn(p);
        when(cp.getNiveauMinimum()).thenReturn(NiveauMaitrise.N1_DEBUTANT);
        
        when(prerequisiteRepository.findById(1L)).thenReturn(Optional.of(cp));
        when(prerequisiteRepository.save(any(CompetencePrerequisite.class))).thenReturn(cp);

        CompetencePrerequisiteDTO result = service.updateNiveauMinimum(1L, NiveauMaitrise.N4_AVANCE);
        
        verify(cp).setNiveauMinimum(NiveauMaitrise.N4_AVANCE);
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("removePrerequisite: deletes when exists")
    void shouldRemove() {
        when(prerequisiteRepository.existsById(1L)).thenReturn(true);
        service.removePrerequisite(1L);
        verify(prerequisiteRepository).deleteById(1L);
    }

    @Test
    @DisplayName("detects circular dependency")
    void shouldDetectCycle() {
        when(prerequisiteRepository.findPrerequisiteIdsByCompetenceId(2L)).thenReturn(List.of(1L));
        
        CompetencePrerequisiteRequest request = CompetencePrerequisiteRequest.builder()
                .prerequisiteId(2L)
                .niveauMinimum(NiveauMaitrise.N1_DEBUTANT)
                .build();

        assertThatThrownBy(() -> service.addPrerequisite(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cycle");
    }
    @Test
    @DisplayName("addPrerequisite: refuse corps nul")
    void shouldRejectNullRequest() {
        assertThatThrownBy(() -> service.addPrerequisite(1L, null))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("addPrerequisite: refuse auto-prérequis")
    void shouldRejectSelfPrerequisite() {
        CompetencePrerequisiteRequest req = CompetencePrerequisiteRequest.builder()
                .prerequisiteId(1L).niveauMinimum(NiveauMaitrise.N1_DEBUTANT).build();
        assertThatThrownBy(() -> service.addPrerequisite(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("son propre prerequis");
    }

    @Test
    @DisplayName("countByCompetenceId: retourne le compte")
    void shouldCount() {
        when(prerequisiteRepository.countByCompetenceId(1L)).thenReturn(5L);
        assertThat(service.countByCompetenceId(1L)).isEqualTo(5L);
    }

    @Test
    @DisplayName("getCompetencesNecessitant: retourne la liste avec labels")
    void shouldGetCompetencesNecessitant() {
        Long prereqId = 2L;
        CompetencePrerequisiteDTO cpDTO = CompetencePrerequisiteDTO.builder()
                .id(1L).competenceId(1L).prerequisiteId(prereqId).niveauMinimum(NiveauMaitrise.N5_EXPERT).build();

        when(competenceRepository.existsById(prereqId)).thenReturn(true);
        when(prerequisiteRepository.findByPrerequisiteId(prereqId)).thenReturn(List.of(cpDTO));

        List<CompetencePrerequisiteDTO> result = service.getCompetencesNecessitant(prereqId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNiveauMinimumLabel()).isEqualTo("N5 - Expert");
    }

    @Test
    @DisplayName("addPrerequisite: refuse competenceId nul")
    void shouldRejectNullCompetenceId() {
        CompetencePrerequisiteRequest req = CompetencePrerequisiteRequest.builder()
                .prerequisiteId(1L).niveauMinimum(NiveauMaitrise.N1_DEBUTANT).build();
        assertThatThrownBy(() -> service.addPrerequisite(null, req))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("addPrerequisite: refuse prerequis deja existant")
    void shouldRejectExistingPrerequisite() {
        CompetencePrerequisiteRequest req = CompetencePrerequisiteRequest.builder()
                .prerequisiteId(2L).niveauMinimum(NiveauMaitrise.N1_DEBUTANT).build();
        when(prerequisiteRepository.existsByCompetenceIdAndPrerequisiteId(1L, 2L)).thenReturn(true);
        
        assertThatThrownBy(() -> service.addPrerequisite(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("deja enregistre");
    }

    @Test
    @DisplayName("prerequisiteBelongsToCompetence: verifie l'appartenance")
    void shouldCheckBelongsTo() {
        when(prerequisiteRepository.findByIdAndCompetenceId(10L, 1L)).thenReturn(Optional.of(new CompetencePrerequisite()));
        assertThat(service.prerequisiteBelongsToCompetence(1L, 10L)).isTrue();
        
        when(prerequisiteRepository.findByIdAndCompetenceId(20L, 1L)).thenReturn(Optional.empty());
        assertThat(service.prerequisiteBelongsToCompetence(1L, 20L)).isFalse();
    }

    @Test
    @DisplayName("checkEnseignantMeetsPrerequisites: retourne true si tout est ok")
    void shouldCheckEnseignantMeets() {
        Long compId = 1L;
        String ensId = "ens1";

        CompetencePrerequisiteDTO cpDTO = CompetencePrerequisiteDTO.builder()
                .id(1L).competenceId(compId).prerequisiteId(2L).niveauMinimum(NiveauMaitrise.N3_INTERMEDIAIRE).build();

        when(competenceRepository.existsById(compId)).thenReturn(true);
        when(prerequisiteRepository.findByCompetenceId(compId)).thenReturn(List.of(cpDTO));

        EnseignantCompetence ec = mock(EnseignantCompetence.class);
        when(ec.getNiveau()).thenReturn(NiveauMaitrise.N4_AVANCE); // Over minimum
        when(enseignantCompetenceRepository.findByEnseignantIdAndCompetenceId(ensId, 2L)).thenReturn(List.of(ec));

        assertThat(service.checkEnseignantMeetsPrerequisites(compId, ensId)).isTrue();
    }
}
