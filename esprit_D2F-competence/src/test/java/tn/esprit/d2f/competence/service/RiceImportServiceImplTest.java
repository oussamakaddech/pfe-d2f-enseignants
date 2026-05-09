package tn.esprit.d2f.competence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.repository.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RiceImportServiceImplTest {

    @Mock private DomaineRepository domaineRepository;
    @Mock private CompetenceRepository competenceRepository;
    @Mock private SousCompetenceRepository sousCompetenceRepository;
    @Mock private SavoirRepository savoirRepository;
    @Mock private EnseignantCompetenceRepository enseignantCompetenceRepository;
    @Mock private RiceImportLogRepository riceImportLogRepository;
    @Mock private ObjectMapper objectMapper;
    @InjectMocks private RiceImportServiceImpl service;

    @Test
    void importRice_emptyRequest_shouldReturnZeroCounts() {
        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of());
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RiceImportResult result = service.importRice(request);

        assertNotNull(result);
        assertEquals(0, result.getDomainesCreated());
        assertEquals(0, result.getCompetencesCreated());
        assertEquals(0, result.getSavoirsCreated());
    }

    @Test
    void importRice_withNewDomaine_shouldCreateDomaine() {
        RiceDomaineRequest domReq = new RiceDomaineRequest();
        domReq.setCode("DOM-001");
        domReq.setNom("Informatique");
        domReq.setDescription("Domaine informatique");

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));

        Domaine newDomaine = Domaine.builder().id(1L).code("DOM-001").nom("Informatique").build();
        when(domaineRepository.findByCode("DOM-001")).thenReturn(Optional.empty());
        when(domaineRepository.save(any())).thenReturn(newDomaine);
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RiceImportResult result = service.importRice(request);

        assertEquals(1, result.getDomainesCreated());
        verify(domaineRepository).save(any());
    }

    @Test
    void importRice_withExistingDomaine_shouldNotCreateNew() {
        RiceDomaineRequest domReq = new RiceDomaineRequest();
        domReq.setCode("DOM-001");
        domReq.setNom("Informatique");

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));

        Domaine existingDomaine = Domaine.builder().id(1L).code("DOM-001").build();
        when(domaineRepository.findByCode("DOM-001")).thenReturn(Optional.of(existingDomaine));
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RiceImportResult result = service.importRice(request);

        assertEquals(0, result.getDomainesCreated());
    }

    @Test
    void importRice_comprehensiveTest() {
        // GIVEN
        RiceSavoirRequest savReq = new RiceSavoirRequest();
        savReq.setCode("SAV-001");
        savReq.setNom("Java Core");
        savReq.setType("theorique");
        savReq.setNiveau("N3_INTERMEDIAIRE");
        savReq.setEnseignantIds(List.of("ens-123"));

        RiceSousCompetenceRequest scReq = new RiceSousCompetenceRequest();
        scReq.setCode("SC-001");
        scReq.setNom("Java Programming");
        scReq.setSavoirs(List.of(savReq));

        RiceCompetenceRequest compReq = new RiceCompetenceRequest();
        compReq.setCode("COMP-001");
        compReq.setNom("Software Development");
        compReq.setSousCompetences(List.of(scReq));

        RiceDomaineRequest domReq = new RiceDomaineRequest();
        domReq.setCode("DOM-001");
        domReq.setNom("IT");
        domReq.setCompetences(List.of(compReq));

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));

        Domaine domaine = Domaine.builder().id(1L).code("DOM-001").build();
        Competence competence = Competence.builder().id(1L).code("COMP-001").build();
        SousCompetence sc = SousCompetence.builder().id(1L).code("SC-001").build();
        Savoir savoir = Savoir.builder().id(1L).code("SAV-001").build();

        when(domaineRepository.findByCode("DOM-001")).thenReturn(Optional.empty());
        when(domaineRepository.save(any(Domaine.class))).thenReturn(domaine);
        
        when(competenceRepository.findByCode("COMP-001")).thenReturn(Optional.empty());
        when(competenceRepository.save(any(Competence.class))).thenReturn(competence);
        
        when(sousCompetenceRepository.findByCode("SC-001")).thenReturn(Optional.empty());
        when(sousCompetenceRepository.save(any(SousCompetence.class))).thenReturn(sc);
        
        when(savoirRepository.findByCode("SAV-001")).thenReturn(Optional.empty());
        when(savoirRepository.save(any(Savoir.class))).thenReturn(savoir);
        
        when(enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId("ens-123", 1L)).thenReturn(false);
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // WHEN
        RiceImportResult result = service.importRice(request);

        // THEN
        assertNotNull(result);
        assertEquals(1, result.getDomainesCreated());
        assertEquals(1, result.getCompetencesCreated());
        assertEquals(1, result.getSousCompetencesCreated());
        assertEquals(1, result.getSavoirsCreated());
        assertEquals(1, result.getAffectationsCreated());
        assertEquals(1, result.getEnseignantsCovered());
    }

    @Test
    @DisplayName("importRice: test des branches orElseGet et parsing")
    void importRice_existingEntitiesAndParsing() {
        // GIVEN
        RiceSavoirRequest savReq = new RiceSavoirRequest();
        savReq.setCode("SAV-EXIST");
        savReq.setNom("Java");
        savReq.setType("invalid_type"); // should fallback to THEORIQUE
        savReq.setNiveau("invalid_niveau"); // should fallback to N2
        savReq.setEnseignantIds(List.of("manual_123", "ens-456")); // manual_ skipped

        RiceDomaineRequest domReq = new RiceDomaineRequest();
        domReq.setCode("DOM-EXIST");
        domReq.setNom("IT");
        domReq.setCompetences(List.of(
            RiceCompetenceRequest.builder()
                .code("COMP-EXIST")
                .nom("Dev")
                .savoirs(List.of(savReq))
                .build()
        ));

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));

        Domaine domaine = Domaine.builder().id(1L).code("DOM-EXIST").build();
        Competence competence = Competence.builder().id(2L).code("COMP-EXIST").build();
        Savoir savoir = Savoir.builder().id(3L).code("SAV-EXIST").build();

        when(domaineRepository.findByCode("DOM-EXIST")).thenReturn(Optional.of(domaine));
        when(competenceRepository.findByCode("COMP-EXIST")).thenReturn(Optional.of(competence));
        when(savoirRepository.findByCode("SAV-EXIST")).thenReturn(Optional.of(savoir));
        
        when(enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId("ens-456", 3L)).thenReturn(true);
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // WHEN
        RiceImportResult result = service.importRice(request);

        // THEN
        assertEquals(0, result.getDomainesCreated());
        assertEquals(0, result.getCompetencesCreated());
        assertEquals(0, result.getSavoirsCreated());
        assertEquals(0, result.getAffectationsCreated()); // already exists and one skipped
        assertEquals(1, result.getEnseignantsCovered()); // ens-456 was processed
    }

    @Test
    @DisplayName("getImportHistory: test de désérialisation")
    void testGetImportHistoryWithJson() throws Exception {
        RiceImportLog log = RiceImportLog.builder()
                .tauxJson("{\"IT\": 85.5}")
                .generatedAt(java.time.LocalDateTime.now())
                .build();
        when(riceImportLogRepository.findAllByOrderByGeneratedAtDesc()).thenReturn(List.of(log));
        when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.core.type.TypeReference.class))).thenReturn(Map.of("IT", 85.5));

        List<RiceImportResult> history = service.getImportHistory();
        assertThat(history).hasSize(1);
        assertThat(history.get(0).getTauxCouvertureParDomaine()).containsEntry("IT", 85.5);
    }

    @Test
    @DisplayName("importRice: test avec sous-compétences et IDs ext_")
    void importRice_sousCompetencesAndExtIds() {
        RiceSousCompetenceRequest scReq = new RiceSousCompetenceRequest();
        scReq.setCode("SC-1");
        scReq.setNom("SC Nom");
        scReq.setSavoirs(List.of(
            RiceSavoirRequest.builder()
                .code("SAV-SC")
                .enseignantIds(List.of("ext_999", "ens-OK"))
                .build()
        ));

        RiceDomaineRequest domReq = new RiceDomaineRequest();
        domReq.setCode("D");
        domReq.setCompetences(List.of(
            RiceCompetenceRequest.builder()
                .code("C")
                .sousCompetences(List.of(scReq))
                .build()
        ));

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));

        when(domaineRepository.findByCode(any())).thenReturn(Optional.of(Domaine.builder().id(1L).build()));
        when(competenceRepository.findByCode(any())).thenReturn(Optional.of(Competence.builder().id(2L).build()));
        when(sousCompetenceRepository.findByCode(any())).thenReturn(Optional.empty());
        when(sousCompetenceRepository.save(any())).thenAnswer(inv -> {
            SousCompetence sc = inv.getArgument(0);
            sc.setId(10L);
            return sc;
        });
        when(savoirRepository.findByCode(any())).thenReturn(Optional.empty());
        when(savoirRepository.save(any())).thenAnswer(inv -> {
            Savoir s = inv.getArgument(0);
            s.setId(100L);
            return s;
        });

        RiceImportResult result = service.importRice(request);
        assertThat(result.getSousCompetencesCreated()).isEqualTo(1);
        assertThat(result.getAffectationsCreated()).isEqualTo(1); // ext_999 ignored
        assertThat(result.getEnseignantsCovered()).isEqualTo(1);
    }
}
