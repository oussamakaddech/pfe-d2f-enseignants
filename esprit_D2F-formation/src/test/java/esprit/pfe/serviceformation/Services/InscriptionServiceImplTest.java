package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Inscription;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Repositories.InscriptionRepository;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import esprit.pfe.serviceformation.Repositories.EnseignantRepository;
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
@DisplayName("InscriptionService - Tests unitaires")
class InscriptionServiceImplTest {

    @Mock
    private InscriptionRepository inscriptionRepository;

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private EnseignantRepository enseignantRepository;

    @InjectMocks
    private InscriptionServiceImpl inscriptionService;

    private Inscription inscription;
    private Formation formation;
    private Enseignant enseignant;

    @BeforeEach
    void setUp() {
        enseignant = Enseignant.builder()
                .id("ENS001")
                .nom("Dupont")
                .prenom("Jean")
                .email("jean.dupont@esprit.tn")
                .specialite("Informatique")
                .build();

        formation = Formation.builder()
                .id(1L)
                .titre("Formation Java")
                .description("Formation avancée Java")
                .dateDebut(LocalDate.of(2026, 5, 1))
                .dateFin(LocalDate.of(2026, 5, 31))
                .lieu("Salle A1")
                .nombrePlaces(30)
                .nombreInscrits(5)
                .inscriptionsOuvertes(true)
                .statut("PLANIFIEE")
                .build();

        inscription = Inscription.builder()
                .id(1L)
                .formation(formation)
                .enseignant(enseignant)
                .dateInscription(LocalDate.now())
                .statut("CONFIRMEE")
                .build();
    }

    @Nested
    @DisplayName("createInscription()")
    class CreateInscription {

        @Test
        @DisplayName("crée une inscription valide")
        void shouldCreateValidInscription() {
            when(inscriptionRepository.save(any(Inscription.class))).thenReturn(inscription);

            Inscription result = inscriptionService.createInscription(inscription);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getStatut()).isEqualTo("CONFIRMEE");
            assertThat(result.getEnseignant().getId()).isEqualTo("ENS001");
            verify(inscriptionRepository, times(1)).save(any(Inscription.class));
        }

        @Test
        @DisplayName("lève une exception si les places sont complètes")
        void shouldThrowExceptionWhenNoPlacesAvailable() {
            Formation fullFormation = Formation.builder()
                    .id(2L)
                    .titre("Formation Complète")
                    .nombrePlaces(30)
                    .nombreInscrits(30)
                    .inscriptionsOuvertes(true)
                    .build();

            Inscription invalidInscription = Inscription.builder()
                    .formation(fullFormation)
                    .enseignant(enseignant)
                    .build();

            when(inscriptionRepository.save(any(Inscription.class)))
                    .thenThrow(new IllegalStateException("Aucune place disponible"));

            assertThatThrownBy(() -> inscriptionService.createInscription(invalidInscription))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("place");
        }
    }

    @Nested
    @DisplayName("updateInscriptionStatus()")
    class UpdateInscriptionStatus {

        @Test
        @DisplayName("met à jour le statut d'une inscription")
        void shouldUpdateInscriptionStatus() {
            Inscription updated = Inscription.builder()
                    .id(1L)
                    .formation(formation)
                    .enseignant(enseignant)
                    .dateInscription(LocalDate.now())
                    .statut("VALIDEE")
                    .build();

            when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
            when(inscriptionRepository.save(any(Inscription.class))).thenReturn(updated);

            Inscription result = inscriptionService.updateInscriptionStatus(1L, "VALIDEE");

            assertThat(result).isNotNull();
            assertThat(result.getStatut()).isEqualTo("VALIDEE");
            verify(inscriptionRepository, times(1)).findById(1L);
        }

        @Test
        @DisplayName("lève une exception si l'inscription n'existe pas")
        void shouldThrowExceptionWhenInscriptionNotFound() {
            when(inscriptionRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> inscriptionService.updateInscriptionStatus(999L, "VALIDEE"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("non trouvée");
        }
    }

    @Nested
    @DisplayName("cancelInscription()")
    class CancelInscription {

        @Test
        @DisplayName("annule une inscription")
        void shouldCancelInscription() {
            when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
            when(inscriptionRepository.save(any(Inscription.class))).thenReturn(inscription);

            inscriptionService.cancelInscription(1L);

            verify(inscriptionRepository, times(1)).findById(1L);
        }
    }

    @Nested
    @DisplayName("getInscriptionsByFormation()")
    class GetInscriptionsByFormation {

        @Test
        @DisplayName("retourne toutes les inscriptions d'une formation")
        void shouldGetInscriptionsByFormation() {
            List<Inscription> inscriptions = List.of(inscription);
            when(inscriptionRepository.findByFormationId(1L)).thenReturn(inscriptions);

            List<Inscription> result = inscriptionService.getInscriptionsByFormation(1L);

            assertThat(result).isNotNull();
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(1L);
            verify(inscriptionRepository, times(1)).findByFormationId(1L);
        }

        @Test
        @DisplayName("retourne une liste vide si aucune inscription")
        void shouldReturnEmptyListWhenNoInscriptions() {
            when(inscriptionRepository.findByFormationId(999L)).thenReturn(new ArrayList<>());

            List<Inscription> result = inscriptionService.getInscriptionsByFormation(999L);

            assertThat(result).isNotNull();
            assertThat(result).isEmpty();
        }
    }
}
