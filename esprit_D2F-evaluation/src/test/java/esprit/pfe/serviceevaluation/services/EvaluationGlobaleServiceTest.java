package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EvaluationGlobaleService - Tests unitaires")
class EvaluationGlobaleServiceTest {

    @Mock
    private EvaluationGlobaleRepository evaluationGlobaleRepository;

    @Mock
    private esprit.pfe.serviceevaluation.client.FormationClient formationClient;

    @InjectMocks
    private EvaluationGlobaleService evaluationGlobaleService;

    private EvaluationGlobale evaluationGlobale;
    private EvaluationGlobaleDTO evaluationGlobaleDTO;

    @BeforeEach
    void setUp() {
        evaluationGlobale = EvaluationGlobale.builder()
                .idEvalGlobale(1L)
                .formationId(1L)
                .noteGlobale(4.5f)
                .commentaireGeneral("Formation très bénéfique")
                .recommandation("À recommander")
                .dateEvaluation(LocalDate.now())
                .build();

        evaluationGlobaleDTO = EvaluationGlobaleDTO.builder()
                .idEvalGlobale(1L)
                .formationId(1L)
                .noteGlobale(4.5f)
                .commentaireGeneral("Formation très bénéfique")
                .recommandation("À recommander")
                .dateEvaluation(LocalDate.now())
                .build();
    }

    @Nested
    @DisplayName("createEvaluationGlobale()")
    class CreateEvaluationGlobale {

        @Test
        @DisplayName("crée une évaluation globale valide")
        void shouldCreateEvaluationGlobale() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(false);
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(evaluationGlobale);

            EvaluationGlobaleDTO result = evaluationGlobaleService.createEvaluationGlobale(evaluationGlobaleDTO, "admin@test.com", "ROLE_ADMIN");

            assertThat(result)
                    .isNotNull()
                    .satisfies(r -> {
                        assertThat(r.getIdEvalGlobale()).isEqualTo(1L);
                        assertThat(r.getFormationId()).isEqualTo(1L);
                        assertThat(r.getNoteGlobale()).isEqualTo(4.5f);
                    });
            verify(evaluationGlobaleRepository, times(1)).save(any(EvaluationGlobale.class));
        }

        @Test
        @DisplayName("lève une exception si une évaluation existe déjà pour cette formation")
        void shouldThrowExceptionWhenDuplicateEvaluation() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(true);

            assertThatThrownBy(() -> evaluationGlobaleService.createEvaluationGlobale(evaluationGlobaleDTO, "admin@test.com", "ROLE_ADMIN"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("évaluation globale existe déjà");
        }
    }

    @Nested
    @DisplayName("updateEvaluationGlobale()")
    class UpdateEvaluationGlobale {

        @Test
        @DisplayName("met à jour une évaluation existante")
        void shouldUpdateEvaluationGlobale() {
            EvaluationGlobaleDTO updateRequest = EvaluationGlobaleDTO.builder()
                    .noteGlobale(5.0f)
                    .commentaireGeneral("Excellent !")
                    .recommandation("À recommander vivement")
                    .dateEvaluation(LocalDate.now())
                    .build();

            EvaluationGlobale updatedEntity = EvaluationGlobale.builder()
                    .idEvalGlobale(1L)
                    .formationId(1L)
                    .noteGlobale(5.0f)
                    .commentaireGeneral("Excellent !")
                    .recommandation("À recommander vivement")
                    .dateEvaluation(LocalDate.now())
                    .build();

            when(evaluationGlobaleRepository.findById(1L)).thenReturn(Optional.of(evaluationGlobale));
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(updatedEntity);

            EvaluationGlobaleDTO result = evaluationGlobaleService.updateEvaluationGlobale(1L, updateRequest, "admin@test.com", "ROLE_ADMIN");

            assertThat(result)
                    .isNotNull()
                    .satisfies(r -> {
                        assertThat(r.getNoteGlobale()).isEqualTo(5.0f);
                        assertThat(r.getCommentaireGeneral()).isEqualTo("Excellent !");
                    });
            verify(evaluationGlobaleRepository, times(1)).findById(1L);
            verify(evaluationGlobaleRepository, times(1)).save(any(EvaluationGlobale.class));
        }
    }

    @Nested
    @DisplayName("deleteEvaluationGlobale()")
    class DeleteEvaluationGlobale {

        @Test
        @DisplayName("supprime une évaluation par id")
        void shouldDeleteEvaluationGlobale() {
            when(evaluationGlobaleRepository.findById(1L)).thenReturn(Optional.of(evaluationGlobale));
            doNothing().when(evaluationGlobaleRepository).delete(any(EvaluationGlobale.class));

            evaluationGlobaleService.deleteEvaluationGlobale(1L);

            verify(evaluationGlobaleRepository, times(1)).delete(evaluationGlobale);
        }
    }

    @Nested
    @DisplayName("getEvaluationGlobaleByFormationId()")
    class GetByFormationId {

        @Test
        @DisplayName("retourne l'évaluation globale d'une formation")
        void shouldGetByFormationId() {
            when(evaluationGlobaleRepository.findByFormationId(1L)).thenReturn(Optional.of(evaluationGlobale));

            EvaluationGlobaleDTO result = evaluationGlobaleService.getEvaluationGlobaleByFormationId(1L);

            assertThat(result)
                    .isNotNull()
                    .satisfies(r -> {
                        assertThat(r.getFormationId()).isEqualTo(1L);
                        assertThat(r.getNoteGlobale()).isEqualTo(4.5f);
                    });
            verify(evaluationGlobaleRepository, times(1)).findByFormationId(1L);
        }
    }

    @Nested
    @DisplayName("createEvaluationGlobale() — règles par rôle")
    class CreateRoles {

        @Test
        @DisplayName("CUP évalue sans participation (pilotage)")
        void cupBypassParticipation() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(false);
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(evaluationGlobale);

            EvaluationGlobaleDTO result = evaluationGlobaleService.createEvaluationGlobale(
                    evaluationGlobaleDTO, "cup@test.com", "ROLE_CUP");

            assertThat(result).isNotNull();
            verify(formationClient, never()).isParticipantOfFormation(anyLong(), anyString());
        }

        @Test
        @DisplayName("CHEF_DEPARTEMENT évalue sans participation (pilotage)")
        void chefBypassParticipation() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(false);
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(evaluationGlobale);

            EvaluationGlobaleDTO result = evaluationGlobaleService.createEvaluationGlobale(
                    evaluationGlobaleDTO, "chef@test.com", "ROLE_CHEF_DEPARTEMENT");

            assertThat(result).isNotNull();
            verify(formationClient, never()).isParticipantOfFormation(anyLong(), anyString());
        }

        @Test
        @DisplayName("enseignant inscrit évalue (participant)")
        void inscritCanEvaluate() {
            when(evaluationGlobaleRepository.existsByFormationId(1L)).thenReturn(false);
            when(formationClient.isParticipantOfFormation(1L, "ens@test.com")).thenReturn(true);
            when(evaluationGlobaleRepository.save(any(EvaluationGlobale.class))).thenReturn(evaluationGlobale);

            EvaluationGlobaleDTO result = evaluationGlobaleService.createEvaluationGlobale(
                    evaluationGlobaleDTO, "ens@test.com", "ROLE_ENSEIGNANT");

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("outsider refusé avec message métier")
        void outsiderDenied() {
            when(formationClient.isParticipantOfFormation(1L, "out@test.com")).thenReturn(false);

            assertThatThrownBy(() -> evaluationGlobaleService.createEvaluationGlobale(
                    evaluationGlobaleDTO, "out@test.com", "ROLE_ENSEIGNANT"))
                    .isInstanceOf(SecurityException.class)
                    .hasMessageContaining("participer");
        }

        @Test
        @DisplayName("responsable dossier exclu")
        void responsableExcluded() {
            assertThatThrownBy(() -> evaluationGlobaleService.createEvaluationGlobale(
                    evaluationGlobaleDTO, "rd@test.com", "ROLE_RESPONSABLE_DOSSIER"))
                    .isInstanceOf(SecurityException.class)
                    .hasMessageContaining("responsable dossier");
        }
    }

    @Nested
    @DisplayName("getAllEvaluationGlobales()")
    class GetAll {

        @Test
        @DisplayName("retourne toutes les évaluations globales")
        void shouldGetAllEvaluations() {
            asRole("admin", "ROLE_ADMIN");
            Page<EvaluationGlobale> evaluations = new PageImpl<>(List.of(evaluationGlobale));
            when(evaluationGlobaleRepository.findAll(any(Pageable.class))).thenReturn(evaluations);

            Page<EvaluationGlobaleDTO> result = evaluationGlobaleService.getAllEvaluationGlobales(Pageable.ofSize(10));

            assertThat(result)
                    .isNotNull()
                    .hasSize(1);
            verify(evaluationGlobaleRepository, times(1)).findAll(any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("getAllEvaluationGlobales() — périmètre par rôle")
    class GetAllScope {

        @Test
        @DisplayName("animateur voit tout")
        void animateurSeesAll() {
            asRole("anim", "ROLE_ANIMATEUR");
            Page<EvaluationGlobale> evaluations = new PageImpl<>(List.of(evaluationGlobale));
            when(evaluationGlobaleRepository.findAll(any(Pageable.class))).thenReturn(evaluations);

            Page<EvaluationGlobaleDTO> result = evaluationGlobaleService.getAllEvaluationGlobales(Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            verify(evaluationGlobaleRepository, never()).findByEnseignantId(anyString(), any(Pageable.class));
        }

        @Test
        @DisplayName("enseignant ne voit que ses évaluations")
        void enseignantSeesOwn() {
            asRole("e@t.tn", "ROLE_ENSEIGNANT");
            when(formationClient.getEnseignantById("e@t.tn")).thenReturn(Map.of("id", "ENS001"));
            when(evaluationGlobaleRepository.findByEnseignantId(eq("ENS001"), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(evaluationGlobale)));

            Page<EvaluationGlobaleDTO> result = evaluationGlobaleService.getAllEvaluationGlobales(Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            verify(evaluationGlobaleRepository, never()).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("sans fiche : liste vide (deny-by-default)")
        void unknownSeesNothing() {
            asRole("ghost@t.tn", "ROLE_ENSEIGNANT");
            when(formationClient.getEnseignantById("ghost@t.tn")).thenReturn(null);

            Page<EvaluationGlobaleDTO> result = evaluationGlobaleService.getAllEvaluationGlobales(Pageable.ofSize(10));

            assertThat(result).isEmpty();
            verify(evaluationGlobaleRepository, never()).findAll(any(Pageable.class));
            verify(evaluationGlobaleRepository, never()).findByEnseignantId(anyString(), any(Pageable.class));
        }
    }

    private static void asRole(String username, String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null,
                        List.of(new SimpleGrantedAuthority(role))));
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }
}
