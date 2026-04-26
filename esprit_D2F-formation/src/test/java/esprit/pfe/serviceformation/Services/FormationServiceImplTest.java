package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("FormationService - Tests unitaires")
class FormationServiceImplTest {

    @Mock
    private FormationRepository formationRepository;

    @InjectMocks
    private FormationServiceImpl formationService;

    private Formation formation;
    private Formation formation2;

    @BeforeEach
    void setUp() {
        formation = Formation.builder()
                .id(1L)
                .titre("Formation Java Avancé")
                .description("Formation sur les patterns Java")
                .dateDebut(LocalDate.of(2026, 5, 1))
                .dateFin(LocalDate.of(2026, 5, 31))
                .lieu("Salle A1")
                .nombrePlaces(30)
                .nombreInscrits(0)
                .statut("PLANIFIEE")
                .build();

        formation2 = Formation.builder()
                .id(2L)
                .titre("Formation Spring Boot")
                .description("Formation sur Spring Boot")
                .dateDebut(LocalDate.of(2026, 6, 1))
                .dateFin(LocalDate.of(2026, 6, 30))
                .lieu("Salle B2")
                .nombrePlaces(25)
                .nombreInscrits(0)
                .statut("PLANIFIEE")
                .build();
    }

    @Nested
    @DisplayName("createFormation()")
    class CreateFormation {

        @Test
        @DisplayName("crée une formation et la retourne")
        void shouldCreateFormation() {
            when(formationRepository.save(any(Formation.class))).thenReturn(formation);

            Formation result = formationService.createFormation(formation);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getTitre()).isEqualTo("Formation Java Avancé");
            assertThat(result.getStatut()).isEqualTo("PLANIFIEE");
            verify(formationRepository, times(1)).save(any(Formation.class));
        }

        @Test
        @DisplayName("lève une exception si titre est null")
        void shouldThrowExceptionWhenTitreIsNull() {
            Formation invalidFormation = Formation.builder()
                    .titre(null)
                    .dateDebut(LocalDate.now())
                    .dateFin(LocalDate.now().plusDays(1))
                    .build();

            when(formationRepository.save(any(Formation.class)))
                    .thenThrow(new IllegalArgumentException("Le titre ne peut pas être null"));

            assertThatThrownBy(() -> formationService.createFormation(invalidFormation))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("titre");
        }
    }

    @Nested
    @DisplayName("updateFormation()")
    class UpdateFormation {

        @Test
        @DisplayName("met à jour une formation existante")
        void shouldUpdateFormation() {
            Formation updated = Formation.builder()
                    .id(1L)
                    .titre("Formation Java Avancé - Updated")
                    .description("Description mise à jour")
                    .dateDebut(LocalDate.of(2026, 5, 1))
                    .dateFin(LocalDate.of(2026, 5, 31))
                    .lieu("Salle A1")
                    .nombrePlaces(35)
                    .nombreInscrits(0)
                    .statut("PLANIFIEE")
                    .build();

            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
            when(formationRepository.save(any(Formation.class))).thenReturn(updated);

            Formation result = formationService.updateFormation(1L, updated);

            assertThat(result).isNotNull();
            assertThat(result.getTitre()).isEqualTo("Formation Java Avancé - Updated");
            assertThat(result.getNombrePlaces()).isEqualTo(35);
            verify(formationRepository, times(1)).findById(1L);
            verify(formationRepository, times(1)).save(any(Formation.class));
        }

        @Test
        @DisplayName("lève une exception si la formation n'existe pas")
        void shouldThrowExceptionWhenFormationNotFound() {
            when(formationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.updateFormation(999L, formation))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
        }
    }

    @Nested
    @DisplayName("deleteFormation()")
    class DeleteFormation {

        @Test
        @DisplayName("supprime une formation par id")
        void shouldDeleteFormation() {
            doNothing().when(formationRepository).deleteById(1L);

            formationService.deleteFormation(1L);

            verify(formationRepository, times(1)).deleteById(1L);
        }

        @Test
        @DisplayName("gère l'erreur si la formation n'existe pas")
        void shouldHandleDeleteNonExistent() {
            doThrow(new RuntimeException("Formation non trouvée"))
                    .when(formationRepository).deleteById(999L);

            assertThatThrownBy(() -> formationService.deleteFormation(999L))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    @Nested
    @DisplayName("getFormationById()")
    class GetFormationById {

        @Test
        @DisplayName("retourne une formation par id")
        void shouldGetFormationById() {
            when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));

            Formation result = formationService.getFormationById(1L);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getTitre()).isEqualTo("Formation Java Avancé");
            verify(formationRepository, times(1)).findById(1L);
        }

        @Test
        @DisplayName("lève une exception si la formation n'existe pas")
        void shouldThrowExceptionWhenNotFound() {
            when(formationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> formationService.getFormationById(999L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
        }
    }

    @Nested
    @DisplayName("getAllFormations()")
    class GetAllFormations {

        @Test
        @DisplayName("retourne toutes les formations")
        void shouldGetAllFormations() {
            List<Formation> formations = List.of(formation, formation2);
            when(formationRepository.findAll()).thenReturn(formations);

            List<Formation> result = formationService.getAllFormations();

            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
            assertThat(result).contains(formation, formation2);
            verify(formationRepository, times(1)).findAll();
        }

        @Test
        @DisplayName("retourne une liste vide s'il n'y a pas de formations")
        void shouldReturnEmptyListWhenNoFormations() {
            when(formationRepository.findAll()).thenReturn(new ArrayList<>());

            List<Formation> result = formationService.getAllFormations();

            assertThat(result).isNotNull();
            assertThat(result).isEmpty();
            verify(formationRepository, times(1)).findAll();
        }
    }
}
