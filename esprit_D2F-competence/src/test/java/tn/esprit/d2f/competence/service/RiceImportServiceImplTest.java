package tn.esprit.d2f.competence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    @Mock private IRiceImportService self;
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
        when(domaineRepository.findByCodeIgnoreCase("DOM-001")).thenReturn(Optional.empty());
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
        when(domaineRepository.findByCodeIgnoreCase("DOM-001")).thenReturn(Optional.of(existingDomaine));
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RiceImportResult result = service.importRice(request);

        assertEquals(0, result.getDomainesCreated());
    }

    @Test
    void importRice_updatesOptionalCompetenceAffiliationsWithoutClearingOmittedValues() {
        RiceCompetenceRequest compReq = RiceCompetenceRequest.builder()
                .code("COMP-UPS")
                .nom("Compétence UP")
                .upIds(List.of(" UP_GC ", "UP_INFO", "UP_GC", " "))
                .departementIds(List.of("DEPT_GC"))
                .build();
        RiceDomaineRequest domReq = RiceDomaineRequest.builder()
                .code("DOM-UPS")
                .nom("Domaine")
                .competences(List.of(compReq))
                .build();
        Competence existing = Competence.builder()
                .id(7L)
                .code("COMP-UPS")
                .upIds(new java.util.LinkedHashSet<>(List.of("UP_OLD")))
                .departementIds(new java.util.LinkedHashSet<>(List.of("DEPT_OLD")))
                .build();
        when(domaineRepository.findByCodeIgnoreCase("DOM-UPS"))
                .thenReturn(Optional.of(Domaine.builder().id(1L).code("DOM-UPS").build()));
        when(competenceRepository.findByCodeIgnoreCase("COMP-UPS")).thenReturn(Optional.of(existing));
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));
        service.importRice(request);

        assertThat(existing.getUpIds()).containsExactly("UP_GC", "UP_INFO");
        assertThat(existing.getDepartementIds()).containsExactly("DEPT_GC");

        compReq.setUpIds(null);
        compReq.setDepartementIds(null);
        service.importRice(request);

        assertThat(existing.getUpIds()).containsExactly("UP_GC", "UP_INFO");
        assertThat(existing.getDepartementIds()).containsExactly("DEPT_GC");
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

        when(domaineRepository.findByCodeIgnoreCase("DOM-001")).thenReturn(Optional.empty());
        when(domaineRepository.save(any(Domaine.class))).thenReturn(domaine);
        
        when(competenceRepository.findByCodeIgnoreCase("COMP-001")).thenReturn(Optional.empty());
        when(competenceRepository.save(any(Competence.class))).thenReturn(competence);
        
        when(sousCompetenceRepository.findByCodeIgnoreCase("SC-001")).thenReturn(Optional.empty());
        when(sousCompetenceRepository.save(any(SousCompetence.class))).thenReturn(sc);
        
        when(savoirRepository.findByCodeIgnoreCase("SAV-001")).thenReturn(Optional.empty());
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

        when(domaineRepository.findByCodeIgnoreCase("DOM-EXIST")).thenReturn(Optional.of(domaine));
        when(competenceRepository.findByCodeIgnoreCase("COMP-EXIST")).thenReturn(Optional.of(competence));
        when(savoirRepository.findByCodeIgnoreCase("SAV-EXIST")).thenReturn(Optional.of(savoir));
        
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
    @DisplayName("getImportHistory paged: retourne une page")
    void testGetImportHistoryPaged() {
        RiceImportResult first = RiceImportResult.builder().domainesCreated(1).build();
        RiceImportResult second = RiceImportResult.builder().domainesCreated(2).build();
        when(self.getImportHistory()).thenReturn(List.of(first, second));

        Page<RiceImportResult> page = service.getImportHistory(PageRequest.of(0, 1));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("getImportHistory paged: retourne vide hors bornes")
    void testGetImportHistoryPagedOutsideRange() {
        RiceImportResult first = RiceImportResult.builder().domainesCreated(1).build();
        when(self.getImportHistory()).thenReturn(List.of(first));

        Page<RiceImportResult> page = service.getImportHistory(PageRequest.of(3, 1));

        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isEqualTo(1);
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

        when(domaineRepository.findByCodeIgnoreCase(any())).thenReturn(Optional.of(Domaine.builder().id(1L).build()));
        when(competenceRepository.findByCodeIgnoreCase(any())).thenReturn(Optional.of(Competence.builder().id(2L).build()));
        when(sousCompetenceRepository.findByCodeIgnoreCase(any())).thenReturn(Optional.empty());
        when(sousCompetenceRepository.save(any())).thenAnswer(inv -> {
            SousCompetence sc = inv.getArgument(0);
            sc.setId(10L);
            return sc;
        });
        when(savoirRepository.findByCodeIgnoreCase(any())).thenReturn(Optional.empty());
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

    @Test
    @DisplayName("importRice: domaine RICE rattaché -> compétence du domaine existant, compétences -> sous-compétences")
    void importRice_withDomaineCible_mapsDomaineToCompetence() {
        RiceSavoirRequest directSavoir = RiceSavoirRequest.builder()
                .code("MT34-S1").nom("Ontologie OWL")
                .type("THEORIQUE").niveau("N3_INTERMEDIAIRE").build();
        RiceSavoirRequest nestedSavoir = RiceSavoirRequest.builder()
                .code("MT34-S2").nom("RDF")
                .type("THEORIQUE").niveau("N2_ELEMENTAIRE").build();
        RiceSousCompetenceRequest enfant = RiceSousCompetenceRequest.builder()
                .code("MT34-C1-A").nom("Triplets")
                .savoirs(List.of(nestedSavoir)).build();
        RiceCompetenceRequest compReq = RiceCompetenceRequest.builder()
                .code("MT34-C1").nom("Modéliser une ontologie")
                .upIds(List.of("UP_GC"))
                .departementIds(List.of("DEPT_GC"))
                .savoirs(List.of(directSavoir))
                .sousCompetences(List.of(enfant))
                .build();
        RiceDomaineRequest domReq = RiceDomaineRequest.builder()
                .code("MT-34").nom("Web Sémantique").description("Module MT-34")
                .competences(List.of(compReq)).build();

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));
        request.setDomaineCibleId("5");

        Domaine cible = Domaine.builder().id(5L).code("INFO").nom("Informatique").build();
        when(domaineRepository.findById(5L)).thenReturn(Optional.of(cible));
        when(competenceRepository.findByCodeIgnoreCase("MT-34")).thenReturn(Optional.empty());
        when(competenceRepository.save(any(Competence.class))).thenAnswer(inv -> {
            Competence saved = inv.getArgument(0);
            saved.setId(50L);
            return saved;
        });
        when(sousCompetenceRepository.findByCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(sousCompetenceRepository.save(any(SousCompetence.class))).thenAnswer(inv -> {
            SousCompetence saved = inv.getArgument(0);
            saved.setId(60L);
            return saved;
        });
        when(savoirRepository.findByCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(savoirRepository.save(any(Savoir.class))).thenAnswer(inv -> {
            Savoir saved = inv.getArgument(0);
            saved.setId(70L);
            return saved;
        });
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RiceImportResult result = service.importRice(request);

        assertThat(result.getDomainesCreated()).isZero();
        assertThat(result.getCompetencesCreated()).isEqualTo(1);
        assertThat(result.getSousCompetencesCreated()).isEqualTo(2);
        assertThat(result.getSavoirsCreated()).isEqualTo(2);
        verify(domaineRepository, never()).save(any());

        org.mockito.ArgumentCaptor<Competence> competenceCaptor =
                org.mockito.ArgumentCaptor.forClass(Competence.class);
        verify(competenceRepository).save(competenceCaptor.capture());
        Competence created = competenceCaptor.getValue();
        // Le nom du domaine RICE devient le nom de la compétence, dans le domaine choisi.
        assertThat(created.getNom()).isEqualTo("Web Sémantique");
        assertThat(created.getCode()).isEqualTo("MT-34");
        assertThat(created.getDomaine()).isSameAs(cible);
        assertThat(created.getUpIds()).containsExactly("UP_GC");
        assertThat(created.getDepartementIds()).containsExactly("DEPT_GC");

        org.mockito.ArgumentCaptor<SousCompetence> scCaptor =
                org.mockito.ArgumentCaptor.forClass(SousCompetence.class);
        verify(sousCompetenceRepository, times(2)).save(scCaptor.capture());
        List<SousCompetence> savedScs = scCaptor.getAllValues();
        SousCompetence racine = savedScs.get(0);
        SousCompetence enfantSauve = savedScs.get(1);
        assertThat(racine.getNom()).isEqualTo("Modéliser une ontologie");
        assertThat(racine.getParent()).isNull();
        assertThat(racine.getNiveau()).isEqualTo(1);
        assertThat(enfantSauve.getNom()).isEqualTo("Triplets");
        assertThat(enfantSauve.getParent()).isSameAs(racine);
        assertThat(enfantSauve.getNiveau()).isEqualTo(2);
    }

    @Test
    @DisplayName("importRice: le domaine de rattachement porté par le domaine RICE prime sur celui de la requête")
    void importRice_domaineCibleParDomaine_prendLeDessus() {
        RiceDomaineRequest lie = RiceDomaineRequest.builder()
                .code("MT-34").nom("Web Sémantique").domaineCibleId("6").build();
        RiceDomaineRequest libre = RiceDomaineRequest.builder()
                .code("MT-35").nom("Bases de données").build();

        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(lie, libre));
        request.setDomaineCibleId("5");

        Domaine defaut = Domaine.builder().id(5L).code("INFO").nom("Informatique").build();
        Domaine choisi = Domaine.builder().id(6L).code("GC").nom("Génie civil").build();
        when(domaineRepository.findById(5L)).thenReturn(Optional.of(defaut));
        when(domaineRepository.findById(6L)).thenReturn(Optional.of(choisi));
        when(competenceRepository.findByCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(competenceRepository.save(any(Competence.class))).thenAnswer(inv -> {
            Competence saved = inv.getArgument(0);
            saved.setId(80L);
            return saved;
        });
        when(riceImportLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RiceImportResult result = service.importRice(request);

        assertThat(result.getDomainesCreated()).isZero();
        assertThat(result.getCompetencesCreated()).isEqualTo(2);

        org.mockito.ArgumentCaptor<Competence> captor =
                org.mockito.ArgumentCaptor.forClass(Competence.class);
        verify(competenceRepository, times(2)).save(captor.capture());
        List<Competence> creees = captor.getAllValues();
        assertThat(creees.get(0).getDomaine()).isSameAs(choisi);
        assertThat(creees.get(0).getNom()).isEqualTo("Web Sémantique");
        assertThat(creees.get(1).getDomaine()).isSameAs(defaut);
        assertThat(creees.get(1).getNom()).isEqualTo("Bases de données");
    }

    @Test
    @DisplayName("importRice: domaine de rattachement inconnu -> 400")
    void importRice_unknownDomaineCible_shouldThrow() {
        RiceDomaineRequest domReq = RiceDomaineRequest.builder()
                .code("MT-34").nom("Web Sémantique").build();
        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));
        request.setDomaineCibleId("999");

        when(domaineRepository.findById(999L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.importRice(request));
        assertThat(ex.getMessage()).contains("Domaine de rattachement introuvable");
        verify(domaineRepository, never()).save(any());
    }

    @Test
    @DisplayName("importRice: identifiant de domaine de rattachement non numérique -> 400")
    void importRice_invalidDomaineCibleId_shouldThrow() {
        RiceDomaineRequest domReq = RiceDomaineRequest.builder()
                .code("MT-34").nom("Web Sémantique").build();
        RiceImportRequest request = new RiceImportRequest();
        request.setDomaines(List.of(domReq));
        request.setDomaineCibleId("abc");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.importRice(request));
        assertThat(ex.getMessage()).contains("Domaine de rattachement invalide");
    }
}
