package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisDTO;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisRequest;
import tn.esprit.d2f.competence.dto.NiveauxGroupesDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.NiveauSavoirRequis;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NiveauDefinitionServiceImpl – Tests unitaires")
class NiveauDefinitionServiceImplTest {

    @Mock
    private NiveauSavoirRequisRepository niveauRepo;
    @Mock
    private CompetenceRepository competenceRepository;
    @Mock
    private SousCompetenceRepository sousCompetenceRepository;
    @Mock
    private SavoirRepository savoirRepository;
    @Mock
    private INiveauDefinitionService self;

    @InjectMocks
    private NiveauDefinitionServiceImpl niveauService;

    private Competence competence;
    private SousCompetence sousCompetence;
    private Savoir savoir;
    private NiveauSavoirRequis nsrCompetence;
    private NiveauSavoirRequis nsrSousCompetence;

    @BeforeEach
    void setUp() {
        competence = Competence.builder().id(1L).nom("Compétence 1").build();
        sousCompetence = SousCompetence.builder().id(1L).nom("Sous-Compétence 1").build();
        savoir = Savoir.builder().id(1L).nom("Savoir 1").code("S1").build();

        nsrCompetence = NiveauSavoirRequis.builder()
                .id(1L)
                .competence(competence)
                .savoir(savoir)
                .niveau(NiveauMaitrise.N1_DEBUTANT)
                .build();

        nsrSousCompetence = NiveauSavoirRequis.builder()
                .id(2L)
                .sousCompetence(sousCompetence)
                .savoir(savoir)
                .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                .build();
    }

    @Test
    @DisplayName("getNiveauxByCompetence: retourne les niveaux groupés par une compétence")
    void testGetNiveauxByCompetence() {
        when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
        when(niveauRepo.findByCompetenceId(1L)).thenReturn(List.of(nsrCompetence));

        NiveauxGroupesDTO result = niveauService.getNiveauxByCompetence(1L);

        assertThat(result).isNotNull();
        assertThat(result.getParentId()).isEqualTo(1L);
        assertThat(result.getNiveaux()).containsKey(NiveauMaitrise.N1_DEBUTANT.name());
    }

    @Test
    @DisplayName("getNiveauxBySousCompetence: retourne les niveaux groupés par sous-compétence")
    void testGetNiveauxBySousCompetence() {
        when(sousCompetenceRepository.findById(1L)).thenReturn(Optional.of(sousCompetence));
        when(niveauRepo.findBySousCompetenceId(1L)).thenReturn(List.of(nsrSousCompetence));

        NiveauxGroupesDTO result = niveauService.getNiveauxBySousCompetence(1L);

        assertThat(result).isNotNull();
        assertThat(result.getParentId()).isEqualTo(1L);
        assertThat(result.getNiveaux()).containsKey(NiveauMaitrise.N2_ELEMENTAIRE.name());
    }

    @Test
    @DisplayName("addSavoirRequis: gère la création pour une compétence")
    void testAddSavoirRequisCompetence() {
        NiveauSavoirRequisRequest req = new NiveauSavoirRequisRequest();
        req.setCompetenceId(1L);
        req.setSavoirId(1L);
        req.setNiveau(NiveauMaitrise.N1_DEBUTANT);

        when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
        when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
        when(niveauRepo.existsByCompetenceIdAndNiveauAndSavoirId(1L, NiveauMaitrise.N1_DEBUTANT, 1L)).thenReturn(false);
        when(niveauRepo.save(any(NiveauSavoirRequis.class))).thenReturn(nsrCompetence);

        NiveauSavoirRequisDTO result = niveauService.addSavoirRequis(req);

        assertThat(result).isNotNull();
        assertThat(result.getCompetenceId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("addSavoirRequis: lance exception si requete invalide")
    void testAddSavoirRequisInvalid() {
        NiveauSavoirRequisRequest req = new NiveauSavoirRequisRequest(); // ni comp ni sous-comp
        assertThatThrownBy(() -> niveauService.addSavoirRequis(req))
                .isInstanceOf(IllegalArgumentException.class);

        req.setCompetenceId(1L);
        req.setSousCompetenceId(1L);
        assertThatThrownBy(() -> niveauService.addSavoirRequis(req))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("addSavoirRequis: lance exception si dejà existant pour competence")
    void testAddSavoirRequisAlreadyExists() {
        NiveauSavoirRequisRequest req = new NiveauSavoirRequisRequest();
        req.setCompetenceId(1L);
        req.setSavoirId(1L);
        req.setNiveau(NiveauMaitrise.N1_DEBUTANT);

        when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
        when(competenceRepository.findById(1L)).thenReturn(Optional.of(competence));
        when(niveauRepo.existsByCompetenceIdAndNiveauAndSavoirId(1L, NiveauMaitrise.N1_DEBUTANT, 1L)).thenReturn(true);

        assertThatThrownBy(() -> niveauService.addSavoirRequis(req))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("addSavoirRequis: gère la création pour une sous-compétence")
    void testAddSavoirRequisSousCompetence() {
        NiveauSavoirRequisRequest req = new NiveauSavoirRequisRequest();
        req.setSousCompetenceId(1L);
        req.setSavoirId(1L);
        req.setNiveau(NiveauMaitrise.N2_ELEMENTAIRE);

        when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
        when(sousCompetenceRepository.findById(1L)).thenReturn(Optional.of(sousCompetence));
        when(niveauRepo.existsBySousCompetenceIdAndNiveauAndSavoirId(1L, NiveauMaitrise.N2_ELEMENTAIRE, 1L)).thenReturn(false);
        when(niveauRepo.save(any(NiveauSavoirRequis.class))).thenReturn(nsrSousCompetence);

        NiveauSavoirRequisDTO result = niveauService.addSavoirRequis(req);

        assertThat(result).isNotNull();
        assertThat(result.getSousCompetenceId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("updateSavoirRequis: modifie correctement un nsr existant")
    void testUpdateSavoirRequis() {
        NiveauSavoirRequisRequest req = new NiveauSavoirRequisRequest();
        req.setNiveau(NiveauMaitrise.N3_INTERMEDIAIRE);
        req.setSavoirId(1L);
        req.setDescription("Desc test");

        when(niveauRepo.findById(1L)).thenReturn(Optional.of(nsrCompetence));
        when(savoirRepository.findById(1L)).thenReturn(Optional.of(savoir));
        when(niveauRepo.save(any(NiveauSavoirRequis.class))).thenReturn(nsrCompetence);

        NiveauSavoirRequisDTO result = niveauService.updateSavoirRequis(1L, req);

        assertThat(result.getNiveau()).isEqualTo(NiveauMaitrise.N3_INTERMEDIAIRE);
    }

    @Test
    @DisplayName("removeSavoirRequis: supprime correctement")
    void testRemoveSavoirRequis() {
        when(niveauRepo.existsById(1L)).thenReturn(true);
        niveauService.removeSavoirRequis(1L);
        verify(niveauRepo, times(1)).deleteById(1L);
    }
    
    @Test
    @DisplayName("getSavoirsRequisByCompetenceAndNiveau: retourne la liste")
    void testGetSavoirsRequisByCompetenceAndNiveau() {
        when(niveauRepo.findByCompetenceIdAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT)).thenReturn(List.of(nsrCompetence));
        
        List<NiveauSavoirRequisDTO> res = niveauService.getSavoirsRequisByCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT);
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("getSavoirsRequisBySousCompetenceAndNiveau: retourne la liste")
    void testGetSavoirsRequisBySousCompetenceAndNiveau() {
        when(niveauRepo.findBySousCompetenceIdAndNiveau(1L, NiveauMaitrise.N2_ELEMENTAIRE)).thenReturn(List.of(nsrSousCompetence));
        
        List<NiveauSavoirRequisDTO> res = niveauService.getSavoirsRequisBySousCompetenceAndNiveau(1L, NiveauMaitrise.N2_ELEMENTAIRE);
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("getSavoirsRequisByCompetenceAndNiveau(paged): retourne une page")
    void testGetSavoirsRequisByCompetenceAndNiveauPaged() {
        Pageable pageable = PageRequest.of(0, 1);
        when(self.getSavoirsRequisByCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT)).thenReturn(List.of(
            NiveauSavoirRequisDTO.builder()
                .id(1L)
                .competenceId(1L)
                .competenceNom("Compétence 1")
                .savoirId(1L)
                .savoirNom("Savoir 1")
                .savoirCode("S1")
                .niveau(NiveauMaitrise.N1_DEBUTANT)
                .build()));

        Page<NiveauSavoirRequisDTO> res = niveauService.getSavoirsRequisByCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT, pageable);

        assertThat(res.getContent()).hasSize(1);
        assertThat(res.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getSavoirsRequisByCompetenceAndNiveau(paged): retourne vide hors bornes")
    void testGetSavoirsRequisByCompetenceAndNiveauPagedOutsideRange() {
        Pageable pageable = PageRequest.of(2, 1);
        when(self.getSavoirsRequisByCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT)).thenReturn(List.of(
            NiveauSavoirRequisDTO.builder()
                .id(1L)
                .competenceId(1L)
                .competenceNom("Compétence 1")
                .savoirId(1L)
                .savoirNom("Savoir 1")
                .savoirCode("S1")
                .niveau(NiveauMaitrise.N1_DEBUTANT)
                .build()));

        Page<NiveauSavoirRequisDTO> res = niveauService.getSavoirsRequisByCompetenceAndNiveau(1L, NiveauMaitrise.N1_DEBUTANT, pageable);

        assertThat(res.getContent()).isEmpty();
        assertThat(res.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getSavoirsRequisBySousCompetenceAndNiveau(paged): retourne une page")
    void testGetSavoirsRequisBySousCompetenceAndNiveauPaged() {
        Pageable pageable = PageRequest.of(0, 1);
        when(self.getSavoirsRequisBySousCompetenceAndNiveau(1L, NiveauMaitrise.N2_ELEMENTAIRE)).thenReturn(List.of(
            NiveauSavoirRequisDTO.builder()
                .id(2L)
                .sousCompetenceId(1L)
                .sousCompetenceNom("Sous-Compétence 1")
                .savoirId(1L)
                .savoirNom("Savoir 1")
                .savoirCode("S1")
                .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                .build()));

        Page<NiveauSavoirRequisDTO> res = niveauService.getSavoirsRequisBySousCompetenceAndNiveau(1L, NiveauMaitrise.N2_ELEMENTAIRE, pageable);

        assertThat(res.getContent()).hasSize(1);
        assertThat(res.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getAll(paged): retourne toutes les NSR paginées")
    void testGetAllPaged() {
        Pageable pageable = PageRequest.of(0, 10);
        when(niveauRepo.findAll(pageable)).thenReturn(new PageImpl<>(List.of(nsrCompetence, nsrSousCompetence)));

        Page<NiveauSavoirRequisDTO> res = niveauService.getAll(pageable);

        assertThat(res.getContent()).hasSize(2);
        assertThat(res.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("getAll: retourne tout")
    void testGetAll() {
        when(niveauRepo.findAll()).thenReturn(List.of(nsrCompetence, nsrSousCompetence));
        List<NiveauSavoirRequisDTO> res = niveauService.getAll();
        assertThat(res).hasSize(2);
    }
}
