package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.FormationFilter;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationSearchService - Tests unitaires")
class FormationSearchServiceTest {

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private FormationMapper formationMapper;

    @InjectMocks
    private FormationSearchService searchService;

    private Formation f1;
    private Formation f2;
    private Formation f3;
    private FormationResponseDTO dto1;
    private FormationResponseDTO dto2;
    private FormationResponseDTO dto3;
    private Date earlyDate;
    private Date midDate;

    @BeforeEach
    void setUp() {
        Up up = new Up();
        up.setId("UP1");

        Dept dept = new Dept();
        dept.setId("DEPT1");

        earlyDate = new Date(1700000000000L); // fixed date
        midDate  = new Date(1800000000000L);

        f1 = new Formation();
        f1.setIdFormation(1L);
        f1.setTitreFormation("Java Avancé");
        f1.setDomaine("IT");
        f1.setCompetence("Java");
        f1.setEtatFormation(EtatFormation.PLANIFIE);
        f1.setOuverte(true);
        f1.setDateDebut(midDate);
        f1.setUp(up);
        f1.setDepartement(dept);

        f2 = new Formation();
        f2.setIdFormation(2L);
        f2.setTitreFormation("Spring Boot");
        f2.setDomaine("IT");
        f2.setCompetence("Spring");
        f2.setEtatFormation(EtatFormation.EN_COURS);
        f2.setOuverte(true);
        f2.setDateDebut(midDate);
        f2.setUp(up);
        f2.setDepartement(dept);

        f3 = new Formation();
        f3.setIdFormation(3L);
        f3.setTitreFormation("Management");
        f3.setDomaine("Management");
        f3.setCompetence("Leadership");
        f3.setEtatFormation(EtatFormation.PLANIFIE);
        f3.setOuverte(false);
        f3.setDateDebut(midDate);

        dto1 = new FormationResponseDTO();
        dto1.setIdFormation(1L);
        dto1.setTitreFormation("Java Avancé");

        dto2 = new FormationResponseDTO();
        dto2.setIdFormation(2L);
        dto2.setTitreFormation("Spring Boot");

        dto3 = new FormationResponseDTO();
        dto3.setIdFormation(3L);
        dto3.setTitreFormation("Management");
    }

    @Nested
    @DisplayName("searchFormations()")
    class SearchFormations {

        @Test
        @DisplayName("retourne toutes les formations avec filtre vide")
        void shouldReturnAllWithEmptyFilter() {
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(f1));
            when(formationRepository.findByIdWithAllRelations(2L)).thenReturn(Optional.of(f2));
            when(formationRepository.findByIdWithAllRelations(3L)).thenReturn(Optional.of(f3));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);
            when(formationMapper.toResponseDTO(f3)).thenReturn(dto3);

            FormationFilter filter = new FormationFilter();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(3);
            verify(formationRepository).findAll();
        }

        @Test
        @DisplayName("filtre par compétence")
        void shouldFilterByCompetence() {
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2));
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(f1));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);

            FormationFilter filter = FormationFilter.builder().competence("Java").build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            assertThat(result.getContent().get(0).getTitreFormation()).isEqualTo("Java Avancé");
        }

        @Test
        @DisplayName("filtre par domaine")
        void shouldFilterByDomain() {
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationRepository.findByIdWithAllRelations(3L)).thenReturn(Optional.of(f3));

            when(formationMapper.toResponseDTO(f3)).thenReturn(dto3);

            FormationFilter filter = FormationFilter.builder().domaine("Management").build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            assertThat(result.getContent().get(0).getTitreFormation()).isEqualTo("Management");
        }

        @Test
        @DisplayName("filtre par upId (ne match rien car up.id est String vs Long)")
        void shouldFilterByUpId() {
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));

            FormationFilter filter = FormationFilter.builder().upId(999L).build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("filtre par etat")
        void shouldFilterByEtat() {
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationRepository.findByIdWithAllRelations(2L)).thenReturn(Optional.of(f2));
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);

            FormationFilter filter = FormationFilter.builder()
                    .etats(List.of(EtatFormation.EN_COURS))
                    .build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            assertThat(result.getContent().get(0).getTitreFormation()).isEqualTo("Spring Boot");
        }

        @Test
        @DisplayName("filtre par ouverte")
        void shouldFilterByOuverte() {
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(f1));
            when(formationRepository.findByIdWithAllRelations(2L)).thenReturn(Optional.of(f2));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);

            FormationFilter filter = FormationFilter.builder().ouverte(true).build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("filtre par date debut (start) - garde formations apres start")
        void shouldFilterByStartDate() {
            Date startFilter = new Date(1750000000000L); // between earlyDate and midDate

            when(formationRepository.findAll()).thenReturn(List.of(f1, f2));
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(f1));
            when(formationRepository.findByIdWithAllRelations(2L)).thenReturn(Optional.of(f2));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);

            FormationFilter filter = FormationFilter.builder().start(startFilter).build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("filtre par date debut (start) - exclut formations avant start")
        void shouldFilterOutBeforeStart() {
            Date startFilter = new Date(1750000000000L); // between earlyDate and midDate
            Formation earlyF = new Formation();
            earlyF.setIdFormation(4L);
            earlyF.setTitreFormation("Early");
            earlyF.setDateDebut(earlyDate);

            when(formationRepository.findAll()).thenReturn(List.of(earlyF, f1));
            lenient().when(formationRepository.findByIdWithAllRelations(4L)).thenReturn(Optional.of(earlyF));
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(f1));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);

            FormationFilter filter = FormationFilter.builder().start(startFilter).build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("filtre par date fin (end) - garde formations avant end")
        void shouldFilterByEndDate() {
            Date endFilter = new Date(1850000000000L); // after midDate

            when(formationRepository.findAll()).thenReturn(List.of(f1, f2));
            when(formationRepository.findByIdWithAllRelations(1L)).thenReturn(Optional.of(f1));
            when(formationRepository.findByIdWithAllRelations(2L)).thenReturn(Optional.of(f2));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);

            FormationFilter filter = FormationFilter.builder().end(endFilter).build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("retourne page vide si aucun resultat")
        void shouldReturnEmptyWhenNoMatch() {
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));

            FormationFilter filter = FormationFilter.builder().competence("NonExistent").build();
            Page<FormationResponseDTO> result = searchService.searchFormations(filter, Pageable.ofSize(10));

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("searchByTitle()")
    class SearchByTitle {

        @Test
        @DisplayName("filtre par titre")
        void shouldFilterByTitle() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(f1, f2, f3)));
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);

            Page<FormationResponseDTO> result = searchService.searchByTitle("Java", Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            assertThat(result.getContent().get(0).getTitreFormation()).isEqualTo("Java Avancé");
        }

        @Test
        @DisplayName("retourne vide si aucun titre ne correspond")
        void shouldReturnEmptyWhenNoMatch() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(f1, f2, f3)));
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));

            Page<FormationResponseDTO> result = searchService.searchByTitle("XYZ", Pageable.ofSize(10));

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("insensible a la casse")
        void shouldBeCaseInsensitive() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(f1, f2, f3)));
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);

            Page<FormationResponseDTO> result = searchService.searchByTitle("java", Pageable.ofSize(10));

            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("searchByState()")
    class SearchByState {

        @Test
        @DisplayName("filtre par état")
        void shouldFilterByState() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(f1, f2, f3)));
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);

            Page<FormationResponseDTO> result = searchService.searchByState("EN_COURS", Pageable.ofSize(10));

            assertThat(result).hasSize(1);
            assertThat(result.getContent().get(0).getTitreFormation()).isEqualTo("Spring Boot");
        }

        @Test
        @DisplayName("retourne vide si aucun etat correspond")
        void shouldReturnEmptyWhenNoMatch() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(f1, f2, f3)));
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));

            Page<FormationResponseDTO> result = searchService.searchByState("ACHEVEE", Pageable.ofSize(10));

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("searchByDomain()")
    class SearchByDomain {

        @Test
        @DisplayName("filtre par domaine")
        void shouldFilterByDomain() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(f1, f2, f3)));
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));
            when(formationMapper.toResponseDTO(f1)).thenReturn(dto1);
            when(formationMapper.toResponseDTO(f2)).thenReturn(dto2);

            Page<FormationResponseDTO> result = searchService.searchByDomain("IT", Pageable.ofSize(10));

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("retourne vide si aucun domaine correspond")
        void shouldReturnEmptyWhenNoMatch() {
            when(formationRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(f1, f2, f3)));
            when(formationRepository.findAll()).thenReturn(List.of(f1, f2, f3));

            Page<FormationResponseDTO> result = searchService.searchByDomain("HR", Pageable.ofSize(10));

            assertThat(result).isEmpty();
        }
    }
}
