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
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.exception.BusinessException;
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
}
