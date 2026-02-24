package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DomaineServiceImpl - Tests unitaires")
class DomaineServiceImplTest {

    @Mock
    DomaineRepository domaineRepository;

    @Mock
    EnseignantCompetenceRepository enseignantCompetenceRepository;

    @InjectMocks
    DomaineServiceImpl domaineService;

    Domaine domaine;

    @BeforeEach
    void setUp() {
        domaine = Domaine.builder()
                .id(1L)
                .code("GC-TECH")
                .nom("Technique Génie Civil")
                .description("Domaine technique")
                .actif(true)
                .competences(new ArrayList<>())
                .build();
    }

    // ─── getAllDomaines ────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getAllDomaines")
    class GetAllDomaines {

        @Test
        @DisplayName("retourne la liste complète mappée en DTOs")
        void shouldReturnAllDomaines() {
            when(domaineRepository.findAll()).thenReturn(List.of(domaine));

            List<DomaineDTO> result = domaineService.getAllDomaines();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCode()).isEqualTo("GC-TECH");
            verify(domaineRepository).findAll();
        }

        @Test
        @DisplayName("retourne liste vide quand aucun domaine")
        void shouldReturnEmptyListWhenNoDomaine() {
            when(domaineRepository.findAll()).thenReturn(List.of());

            List<DomaineDTO> result = domaineService.getAllDomaines();

            assertThat(result).isEmpty();
        }
    }

    // ─── getDomainesActifs ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("getDomainesActifs")
    class GetDomainesActifs {

        @Test
        @DisplayName("ne retourne que les domaines actifs")
        void shouldReturnOnlyActifs() {
            when(domaineRepository.findByActifTrue()).thenReturn(List.of(domaine));

            List<DomaineDTO> result = domaineService.getDomainesActifs();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getActif()).isTrue();
        }
    }

    // ─── getDomaineById ────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getDomaineById")
    class GetDomaineById {

        @Test
        @DisplayName("retourne le DTO quand trouvé")
        void shouldReturnDTOWhenFound() {
            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));

            DomaineDTO result = domaineService.getDomaineById(1L);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getCode()).isEqualTo("GC-TECH");
        }

        @Test
        @DisplayName("lance EntityNotFoundException quand non trouvé")
        void shouldThrowWhenNotFound() {
            when(domaineRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> domaineService.getDomaineById(99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("99");
        }
    }

    // ─── getDomaineByCode ──────────────────────────────────────────────────────
    @Nested
    @DisplayName("getDomaineByCode")
    class GetDomaineByCode {

        @Test
        @DisplayName("retourne le DTO quand code trouvé")
        void shouldReturnDTOWhenFound() {
            when(domaineRepository.findByCode("GC-TECH")).thenReturn(Optional.of(domaine));

            DomaineDTO result = domaineService.getDomaineByCode("GC-TECH");

            assertThat(result.getCode()).isEqualTo("GC-TECH");
        }

        @Test
        @DisplayName("lance EntityNotFoundException quand code inconnu")
        void shouldThrowWhenCodeNotFound() {
            when(domaineRepository.findByCode("INCONNU")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> domaineService.getDomaineByCode("INCONNU"))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("INCONNU");
        }
    }

    // ─── createDomaine ─────────────────────────────────────────────────────────
    @Nested
    @DisplayName("createDomaine")
    class CreateDomaine {

        @Test
        @DisplayName("crée et retourne le DTO si le code est unique")
        void shouldCreateWhenCodeIsUnique() {
            when(domaineRepository.existsByCode("GC-TECH")).thenReturn(false);
            when(domaineRepository.save(any(Domaine.class))).thenReturn(domaine);

            DomaineDTO result = domaineService.createDomaine(domaine);

            assertThat(result.getCode()).isEqualTo("GC-TECH");
            verify(domaineRepository).save(domaine);
        }

        @Test
        @DisplayName("lance IllegalArgumentException si le code est dupliqué")
        void shouldThrowWhenCodeDuplicated() {
            when(domaineRepository.existsByCode("GC-TECH")).thenReturn(true);

            assertThatThrownBy(() -> domaineService.createDomaine(domaine))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("GC-TECH");

            verify(domaineRepository, never()).save(any());
        }
    }

    // ─── updateDomaine ─────────────────────────────────────────────────────────
    @Nested
    @DisplayName("updateDomaine")
    class UpdateDomaine {

        @Test
        @DisplayName("met à jour et retourne le DTO si trouvé")
        void shouldUpdateWhenFound() {
            Domaine updated = Domaine.builder()
                    .id(1L).code("GC-NEW").nom("Nouveau nom").description("desc").actif(true)
                    .competences(new ArrayList<>()).build();
            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(domaineRepository.save(any())).thenReturn(updated);

            DomaineDTO result = domaineService.updateDomaine(1L, updated);

            assertThat(result.getCode()).isEqualTo("GC-NEW");
        }

        @Test
        @DisplayName("lance EntityNotFoundException si non trouvé")
        void shouldThrowWhenNotFound() {
            when(domaineRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> domaineService.updateDomaine(99L, domaine))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ─── deleteDomaine ─────────────────────────────────────────────────────────
    @Nested
    @DisplayName("deleteDomaine")
    class DeleteDomaine {

        @Test
        @DisplayName("supprime le domaine et ses affectations enseignant")
        void shouldDeleteWithCascade() {
            when(domaineRepository.existsById(1L)).thenReturn(true);
            when(enseignantCompetenceRepository.findSavoirIdsByDomaineId(1L))
                    .thenReturn(List.of(10L, 20L));

            domaineService.deleteDomaine(1L);

            verify(enseignantCompetenceRepository).deleteBySavoirIdIn(List.of(10L, 20L));
            verify(domaineRepository).deleteById(1L);
        }

        @Test
        @DisplayName("supprime sans affectations si aucun savoir lié")
        void shouldDeleteWithoutAffectations() {
            when(domaineRepository.existsById(1L)).thenReturn(true);
            when(enseignantCompetenceRepository.findSavoirIdsByDomaineId(1L))
                    .thenReturn(List.of());

            domaineService.deleteDomaine(1L);

            verify(enseignantCompetenceRepository, never()).deleteBySavoirIdIn(any());
            verify(domaineRepository).deleteById(1L);
        }

        @Test
        @DisplayName("lance EntityNotFoundException si non trouvé")
        void shouldThrowWhenNotFound() {
            when(domaineRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> domaineService.deleteDomaine(99L))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ─── toggleActif ───────────────────────────────────────────────────────────
    @Nested
    @DisplayName("toggleActif")
    class ToggleActif {

        @Test
        @DisplayName("passe actif → inactif")
        void shouldToggleFromTrueToFalse() {
            domaine.setActif(true);
            Domaine toggled = Domaine.builder()
                    .id(1L).code("GC-TECH").nom("Technique Génie Civil")
                    .description("desc").actif(false).competences(new ArrayList<>()).build();
            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(domaineRepository.save(any())).thenReturn(toggled);

            DomaineDTO result = domaineService.toggleActif(1L);

            assertThat(result.getActif()).isFalse();
        }

        @Test
        @DisplayName("passe inactif → actif")
        void shouldToggleFromFalseToTrue() {
            domaine.setActif(false);
            Domaine toggled = Domaine.builder()
                    .id(1L).code("GC-TECH").nom("Technique Génie Civil")
                    .description("desc").actif(true).competences(new ArrayList<>()).build();
            when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
            when(domaineRepository.save(any())).thenReturn(toggled);

            DomaineDTO result = domaineService.toggleActif(1L);

            assertThat(result.getActif()).isTrue();
        }

        @Test
        @DisplayName("lance EntityNotFoundException si non trouvé")
        void shouldThrowWhenNotFound() {
            when(domaineRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> domaineService.toggleActif(99L))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
