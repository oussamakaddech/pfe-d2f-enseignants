package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.repository.*;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StructureServiceImpl – Tests unitaires")
class StructureServiceImplTest {

    @Mock
    private DomaineRepository domaineRepository;
    @Mock
    private CompetenceRepository competenceRepository;
    @Mock
    private SousCompetenceRepository sousCompetenceRepository;
    @Mock
    private SavoirRepository savoirRepository;
    @Mock
    private EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Mock
    private CompetenceMapper competenceMapper;

    @InjectMocks
    private StructureServiceImpl structureService;

    private Domaine domaine;
    private Competence competence;
    private SousCompetence sousCompetence;
    private Savoir savoir1;
    private Savoir savoir2;

    @BeforeEach
    void setUp() {
        domaine = Domaine.builder().id(1L).code("D1").nom("Domaine 1").actif(true).build();
        competence = Competence.builder().id(1L).code("C1").nom("Competence 1").domaine(domaine).build();
        sousCompetence = SousCompetence.builder().id(1L).code("SC1").nom("Sous-Competence 1").competence(competence).build();
        savoir1 = Savoir.builder().id(1L).code("S1").nom("Savoir 1").type(TypeSavoir.THEORIQUE).competence(competence).build();
        savoir2 = Savoir.builder().id(2L).code("S2").nom("Savoir 2").type(TypeSavoir.PRATIQUE).sousCompetence(sousCompetence).build();

        domaine.setCompetences(List.of(competence));
        competence.setSousCompetences(List.of(sousCompetence));
        competence.setSavoirs(List.of(savoir1));
        sousCompetence.setSavoirs(List.of(savoir2));
    }

    @Test
    @DisplayName("getStructureComplete: doit retourner la structure complète")
    void testGetStructureComplete() {
        when(domaineRepository.findAll()).thenReturn(List.of(domaine));
        when(savoirRepository.findAll()).thenReturn(List.of(savoir1, savoir2));
        when(competenceRepository.count()).thenReturn(1L);
        when(sousCompetenceRepository.count()).thenReturn(1L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(anyLong())).thenReturn(2L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(anyLong())).thenReturn(1L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsBySousCompetenceId(anyLong())).thenReturn(3L);
        when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(new SavoirDTO());

        StructureArbreDTO result = structureService.getStructureComplete();

        assertThat(result).isNotNull();
        assertThat(result.getDomaines()).isNotEmpty().hasSize(1);
        assertThat(result.getStatistiques()).isNotNull();
        assertThat(result.getStatistiques().getTotalSavoirsTheoriques()).isEqualTo(1);
        assertThat(result.getStatistiques().getTotalSavoirsPratiques()).isEqualTo(1);
    }

    @Test
    @DisplayName("getStructureDomaine: doit retourner la structure d'un domaine existant")
    void testGetStructureDomaine() {
        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(1L)).thenReturn(2L);

        StructureArbreDTO.DomaineArbreDTO result = structureService.getStructureDomaine(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCompetences()).isNotEmpty().hasSize(1);
    }

    @Test
    @DisplayName("getStructureDomaine: doit lever une exception si domaine non trouvé")
    void testGetStructureDomaineNotFound() {
        when(domaineRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> structureService.getStructureDomaine(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("rechercheGlobale: doit retourner tous les résultats trouvés")
    void testRechercheGlobale() {
        when(domaineRepository.searchByKeyword("test")).thenReturn(List.of(domaine));
        when(competenceRepository.searchByKeyword("test")).thenReturn(List.of(competence));
        when(sousCompetenceRepository.searchByKeyword("test")).thenReturn(List.of(sousCompetence));
        when(savoirRepository.searchByKeyword("test")).thenReturn(List.of(savoir1));

        when(competenceMapper.toDTOLight(any(Domaine.class))).thenReturn(new DomaineDTO());
        when(competenceMapper.toDTO(any(Competence.class))).thenReturn(new CompetenceDTO());
        when(competenceMapper.toDTO(any(SousCompetence.class))).thenReturn(new SousCompetenceDTO());
        when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(new SavoirDTO());

        SearchResultDTO result = structureService.rechercheGlobale("test");

        assertThat(result).isNotNull();
        assertThat(result.getTotalResults()).isEqualTo(4);
    }

    @Test
    @DisplayName("rechercheParDomaine: doit retourner les résultats filtrés")
    void testRechercheParDomaine() {
        when(competenceRepository.searchByDomaineIdAndKeyword(1L, "test")).thenReturn(List.of(competence));
        when(sousCompetenceRepository.searchByDomaineIdAndKeyword(1L, "test")).thenReturn(List.of(sousCompetence));
        when(savoirRepository.searchByDomaineIdAndKeyword(1L, "test")).thenReturn(List.of(savoir1));

        when(competenceMapper.toDTO(any(Competence.class))).thenReturn(new CompetenceDTO());
        when(competenceMapper.toDTO(any(SousCompetence.class))).thenReturn(new SousCompetenceDTO());
        when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(new SavoirDTO());

        SearchResultDTO result = structureService.rechercheParDomaine(1L, "test");

        assertThat(result).isNotNull();
        assertThat(result.getTotalResults()).isEqualTo(3);
        assertThat(result.getDomaines()).isEmpty();
    }

    @Test
    @DisplayName("getStructureComplete(upId, departementId): avec domaines filtrés")
    void testGetStructureCompleteWithFilters() {
        when(domaineRepository.findByUpIdAndDepartementId("1", "2")).thenReturn(List.of(domaine));
        when(savoirRepository.findAll()).thenReturn(List.of(savoir1, savoir2));
        when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(new SavoirDTO());

        StructureArbreDTO result = structureService.getStructureComplete("1", "2");

        assertThat(result).isNotNull();
        assertThat(result.getDomaines()).hasSize(1);
        assertThat(result.getStatistiques().getTotalDomaines()).isEqualTo(1);
        assertThat(result.getStatistiques().getTotalCompetences()).isEqualTo(1);
        assertThat(result.getStatistiques().getTotalSavoirsTheoriques()).isEqualTo(1);
        assertThat(result.getStatistiques().getTotalSavoirsPratiques()).isEqualTo(1);
    }

    @Test
    @DisplayName("getStructureComplete(upId, departementId): avec domaines vides")
    void testGetStructureCompleteWithFiltersEmptyDomaines() {
        when(domaineRepository.findByUpIdAndDepartementId("99", "99")).thenReturn(List.of());

        StructureArbreDTO result = structureService.getStructureComplete("99", "99");

        assertThat(result).isNotNull();
        assertThat(result.getDomaines()).isEmpty();
        assertThat(result.getStatistiques().getTotalDomaines()).isZero();
        assertThat(result.getStatistiques().getTotalSavoirs()).isZero();
    }

    @Test
    @DisplayName("buildCompetenceArbre: sousCompetences null et savoirs null")
    void testBuildCompetenceArbreWithNulls() {
        Competence comp = Competence.builder().id(10L).code("CX").nom("Comp X").domaine(domaine).build();
        comp.setSousCompetences(null);
        comp.setSavoirs(null);
        domaine.setCompetences(List.of(comp));

        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(1L)).thenReturn(0L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(10L)).thenReturn(0L);

        StructureArbreDTO.DomaineArbreDTO result = structureService.getStructureDomaine(1L);

        assertThat(result.getCompetences()).hasSize(1);
        assertThat(result.getCompetences().get(0).getSousCompetences()).isEmpty();
        assertThat(result.getCompetences().get(0).getSavoirsDirect()).isEmpty();
        assertThat(result.getCompetences().get(0).getNombreSavoirs()).isZero();
    }

    @Test
    @DisplayName("buildSousCompetenceArbre: enfants null et savoirs null")
    void testBuildSousCompetenceArbreWithNulls() {
        SousCompetence sc = SousCompetence.builder().id(20L).code("SCX").nom("SC X").competence(competence).build();
        sc.setEnfants(null);
        sc.setSavoirs(null);
        competence.setSousCompetences(List.of(sc));
        competence.setSavoirs(null);
        domaine.setCompetences(List.of(competence));

        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(1L)).thenReturn(0L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(1L)).thenReturn(0L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsBySousCompetenceId(20L)).thenReturn(0L);

        StructureArbreDTO.DomaineArbreDTO result = structureService.getStructureDomaine(1L);

        assertThat(result.getCompetences().get(0).getSousCompetences()).hasSize(1);
        assertThat(result.getCompetences().get(0).getSousCompetences().get(0).getEnfants()).isEmpty();
        assertThat(result.getCompetences().get(0).getSousCompetences().get(0).getSavoirs()).isEmpty();
        assertThat(result.getCompetences().get(0).getSousCompetences().get(0).getNombreSavoirs()).isZero();
    }

    @Test
    @DisplayName("countSavoirsRecursive: avec enfants imbriqués")
    void testCountSavoirsRecursiveWithNestedEnfants() {
        Savoir savoirEnfant = Savoir.builder().id(3L).code("SE").nom("Savoir Enfant").type(TypeSavoir.THEORIQUE).build();
        SousCompetence enfant = SousCompetence.builder().id(30L).code("ENF").nom("Enfant").competence(competence).build();
        enfant.setSavoirs(List.of(savoirEnfant));
        enfant.setEnfants(List.of());

        sousCompetence.setEnfants(List.of(enfant));
        sousCompetence.setSavoirs(List.of(savoir2));
        competence.setSousCompetences(List.of(sousCompetence));
        competence.setSavoirs(List.of(savoir1));
        domaine.setCompetences(List.of(competence));

        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(1L)).thenReturn(0L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(1L)).thenReturn(0L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsBySousCompetenceId(anyLong())).thenReturn(0L);
        when(competenceMapper.toDTO(any(Savoir.class))).thenReturn(new SavoirDTO());

        StructureArbreDTO.DomaineArbreDTO result = structureService.getStructureDomaine(1L);

        // savoir1 (direct) + savoir2 (sc) + savoirEnfant (enfant de sc) = 3
        assertThat(result.getCompetences().get(0).getNombreSavoirs()).isEqualTo(3);
    }

    @Test
    @DisplayName("buildSousCompetenceArbre: sousCompetence avec parent non-null est filtrée")
    void testBuildCompetenceArbreFiltersChildrenWithParent() {
        SousCompetence childSc = SousCompetence.builder().id(40L).code("CHILD").nom("Child").competence(competence).parent(sousCompetence).build();
        sousCompetence.setEnfants(List.of(childSc));
        sousCompetence.setSavoirs(null);
        competence.setSousCompetences(List.of(sousCompetence, childSc));
        competence.setSavoirs(null);
        domaine.setCompetences(List.of(competence));

        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(1L)).thenReturn(0L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(1L)).thenReturn(0L);
        when(enseignantCompetenceRepository.countDistinctEnseignantsBySousCompetenceId(anyLong())).thenReturn(0L);

        StructureArbreDTO.DomaineArbreDTO result = structureService.getStructureDomaine(1L);

        // Only sousCompetence (parent==null) should appear; childSc (parent!=null) is filtered
        assertThat(result.getCompetences().get(0).getSousCompetences()).hasSize(1);
        assertThat(result.getCompetences().get(0).getSousCompetences().get(0).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Exception handling sur count distincts")
    void testExceptionHandlingOnCounts() {
        when(domaineRepository.findById(1L)).thenReturn(Optional.of(domaine));
        when(enseignantCompetenceRepository.countDistinctEnseignantsByDomaineId(1L)).thenThrow(new RuntimeException("DB Error"));
        when(enseignantCompetenceRepository.countDistinctEnseignantsByCompetenceId(1L)).thenThrow(new RuntimeException("DB Error"));
        when(enseignantCompetenceRepository.countDistinctEnseignantsBySousCompetenceId(1L)).thenThrow(new RuntimeException("DB Error"));

        StructureArbreDTO.DomaineArbreDTO result = structureService.getStructureDomaine(1L);

        assertThat(result.getNombreEnseignants()).isZero();
        assertThat(result.getCompetences().get(0).getNombreEnseignants()).isZero();
        assertThat(result.getCompetences().get(0).getSousCompetences().get(0).getNombreEnseignants()).isZero();
    }
}
