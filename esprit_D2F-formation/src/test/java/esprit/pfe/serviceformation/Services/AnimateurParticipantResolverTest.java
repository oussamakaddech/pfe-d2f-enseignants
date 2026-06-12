package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.FormationWorkflowRequestAdditionConfig.AdditionMode;
import esprit.pfe.serviceformation.dto.FormationWorkflowRequestAdditionConfig.AnimateurAdditionConfig;
import esprit.pfe.serviceformation.dto.FormationWorkflowRequestAdditionConfig.ParticipantAdditionConfig;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnimateurParticipantResolverTest {

    @Mock
    private EnseignantRepository enseignantRepository;

    @InjectMocks
    private AnimateurParticipantResolver resolver;

    @Test
    void resolveAnimateursWithNullConfigReturnsEmpty() {
        assertThat(resolver.resolveAnimateurs(null)).isEmpty();
    }

    @Test
    void resolveParticipantsWithNullConfigReturnsEmpty() {
        assertThat(resolver.resolveParticipants(null)).isEmpty();
    }

    @Test
    void resolveAnimateursWithNullModeReturnsEmpty() {
        AnimateurAdditionConfig config = new AnimateurAdditionConfig();
        assertThat(resolver.resolveAnimateurs(config)).isEmpty();
    }

    @Test
    void resolveParticipantsWithNullModeReturnsEmpty() {
        ParticipantAdditionConfig config = new ParticipantAdditionConfig();
        assertThat(resolver.resolveParticipants(config)).isEmpty();
    }

    @Test
    void resolveManualReturnsAllById() {
        Enseignant e1 = new Enseignant();
        e1.setId("E1");
        when(enseignantRepository.findAllById(anyList())).thenReturn(List.of(e1));

        AnimateurAdditionConfig config = new AnimateurAdditionConfig();
        config.setMode(AdditionMode.MANUAL);
        config.setManualIds(List.of("E1"));

        List<Enseignant> result = resolver.resolveAnimateurs(config);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("E1");
    }

    @Test
    void resolveManualWithEmptyIdsReturnsEmpty() {
        AnimateurAdditionConfig config = new AnimateurAdditionConfig();
        config.setMode(AdditionMode.MANUAL);
        config.setManualIds(List.of());

        assertThat(resolver.resolveAnimateurs(config)).isEmpty();
    }

    @Test
    void resolveManualWithNullIdsReturnsEmpty() {
        AnimateurAdditionConfig config = new AnimateurAdditionConfig();
        config.setMode(AdditionMode.MANUAL);

        assertThat(resolver.resolveAnimateurs(config)).isEmpty();
    }

    @Test
    void resolveByDeptReturnsEnseignants() {
        Enseignant e = new Enseignant();
        e.setId("E1");
        when(enseignantRepository.findByDeptIdIn(anyList())).thenReturn(List.of(e));

        ParticipantAdditionConfig config = new ParticipantAdditionConfig();
        config.setMode(AdditionMode.AUTO_BY_DEPT);
        config.setDeptIds(List.of("D1"));

        List<Enseignant> result = resolver.resolveParticipants(config);

        assertThat(result).hasSize(1);
    }

    @Test
    void resolveByDeptWithEmptyIdsReturnsEmpty() {
        ParticipantAdditionConfig config = new ParticipantAdditionConfig();
        config.setMode(AdditionMode.AUTO_BY_DEPT);
        config.setDeptIds(List.of());

        assertThat(resolver.resolveParticipants(config)).isEmpty();
    }

    @Test
    void resolveByDeptWithNullIdsReturnsEmpty() {
        ParticipantAdditionConfig config = new ParticipantAdditionConfig();
        config.setMode(AdditionMode.AUTO_BY_DEPT);

        assertThat(resolver.resolveParticipants(config)).isEmpty();
    }

    @Test
    void resolveByUpReturnsEnseignants() {
        Enseignant e = new Enseignant();
        e.setId("E1");
        when(enseignantRepository.findByUpIdIn(anyList())).thenReturn(List.of(e));

        ParticipantAdditionConfig config = new ParticipantAdditionConfig();
        config.setMode(AdditionMode.AUTO_BY_UP);
        config.setUpIds(List.of("UP1"));

        List<Enseignant> result = resolver.resolveParticipants(config);

        assertThat(result).hasSize(1);
    }

    @Test
    void resolveByUpWithEmptyIdsReturnsEmpty() {
        ParticipantAdditionConfig config = new ParticipantAdditionConfig();
        config.setMode(AdditionMode.AUTO_BY_UP);
        config.setUpIds(List.of());

        assertThat(resolver.resolveParticipants(config)).isEmpty();
    }

    @Test
    void resolveByUpWithNullIdsReturnsEmpty() {
        ParticipantAdditionConfig config = new ParticipantAdditionConfig();
        config.setMode(AdditionMode.AUTO_BY_UP);

        assertThat(resolver.resolveParticipants(config)).isEmpty();
    }

    @Test
    void repositoryExceptionReturnsEmptyList() {
        when(enseignantRepository.findAllById(anyList())).thenThrow(new RuntimeException("DB down"));

        AnimateurAdditionConfig config = new AnimateurAdditionConfig();
        config.setMode(AdditionMode.MANUAL);
        config.setManualIds(List.of("E1"));

        assertThat(resolver.resolveAnimateurs(config)).isEmpty();
    }
}
