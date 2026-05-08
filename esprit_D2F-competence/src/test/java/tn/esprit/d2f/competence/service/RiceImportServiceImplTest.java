package tn.esprit.d2f.competence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.repository.*;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
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
    void getImportHistory_shouldReturnMappedResults() {
        RiceImportLog log = RiceImportLog.builder()
                .domainesCreated(2)
                .competencesCreated(5)
                .savoirsCreated(10)
                .message("Test import")
                .build();
        when(riceImportLogRepository.findAllByOrderByGeneratedAtDesc()).thenReturn(List.of(log));

        List<RiceImportResult> history = service.getImportHistory();

        assertEquals(1, history.size());
        assertEquals(2, history.get(0).getDomainesCreated());
        assertEquals(5, history.get(0).getCompetencesCreated());
    }
}
