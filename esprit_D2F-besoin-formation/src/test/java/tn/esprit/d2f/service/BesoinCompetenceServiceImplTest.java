package tn.esprit.d2f.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.dto.BesoinCompetenceDTO;
import tn.esprit.d2f.entity.BesoinCompetence;
import tn.esprit.d2f.repository.BesoinCompetenceRepository;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BesoinCompetenceServiceImplTest {

    @Mock
    private BesoinCompetenceRepository repository;

    private BesoinCompetenceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BesoinCompetenceServiceImpl(repository);
    }

    @Test
    void getByBesoin_shouldReturnEmptyList() {
        long besoinId = 1L;
        when(repository.findByBesoinId(besoinId)).thenReturn(Collections.emptyList());

        List<BesoinCompetenceDTO> result = service.getByBesoin(besoinId);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(repository).findByBesoinId(besoinId);
    }

    @Test
    void getByBesoin_shouldReturnListOfCompetences() {
        long besoinId = 1L;
        BesoinCompetence competence = BesoinCompetence.builder()
                .id(1L)
                .besoinId(besoinId)
                .domaineId(10L)
                .competenceId(20L)
                .competenceNom("Java Programming")
                .savoirId(30L)
                .savoirNom("OOP")
                .sousCompetenceId(40L)
                .build();

        when(repository.findByBesoinId(besoinId)).thenReturn(Arrays.asList(competence));

        List<BesoinCompetenceDTO> result = service.getByBesoin(besoinId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getId());
        assertEquals(besoinId, result.get(0).getBesoinId());
        assertEquals("Java Programming", result.get(0).getCompetenceNom());
        verify(repository).findByBesoinId(besoinId);
    }

    @Test
    void getByBesoin_shouldReturnMultipleCompetences() {
        long besoinId = 2L;
        BesoinCompetence competence1 = BesoinCompetence.builder()
                .id(1L)
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        BesoinCompetence competence2 = BesoinCompetence.builder()
                .id(2L)
                .besoinId(besoinId)
                .competenceId(21L)
                .competenceNom("Spring Boot")
                .build();

        when(repository.findByBesoinId(besoinId)).thenReturn(Arrays.asList(competence1, competence2));

        List<BesoinCompetenceDTO> result = service.getByBesoin(besoinId);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("Java", result.get(0).getCompetenceNom());
        assertEquals("Spring Boot", result.get(1).getCompetenceNom());
        verify(repository).findByBesoinId(besoinId);
    }

    @Test
    void replaceAll_shouldDeleteAndSaveNewCompetences() {
        long besoinId = 1L;
        BesoinCompetenceDTO dto1 = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .domaineId(10L)
                .competenceId(20L)
                .competenceNom("Java")
                .savoirId(30L)
                .savoirNom("OOP")
                .sousCompetenceId(40L)
                .build();

        BesoinCompetenceDTO dto2 = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .domaineId(11L)
                .competenceId(21L)
                .competenceNom("Spring")
                .savoirId(31L)
                .savoirNom("Frameworks")
                .sousCompetenceId(41L)
                .build();

        BesoinCompetence saved1 = BesoinCompetence.builder()
                .id(1L)
                .besoinId(besoinId)
                .domaineId(10L)
                .competenceId(20L)
                .competenceNom("Java")
                .savoirId(30L)
                .savoirNom("OOP")
                .sousCompetenceId(40L)
                .build();

        BesoinCompetence saved2 = BesoinCompetence.builder()
                .id(2L)
                .besoinId(besoinId)
                .domaineId(11L)
                .competenceId(21L)
                .competenceNom("Spring")
                .savoirId(31L)
                .savoirNom("Frameworks")
                .sousCompetenceId(41L)
                .build();

        when(repository.saveAll(anyList())).thenReturn(Arrays.asList(saved1, saved2));

        List<BesoinCompetenceDTO> result = service.replaceAll(besoinId, Arrays.asList(dto1, dto2));

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("Java", result.get(0).getCompetenceNom());
        assertEquals("Spring", result.get(1).getCompetenceNom());
        verify(repository).deleteByBesoinId(besoinId);
        verify(repository).saveAll(anyList());
    }

    @Test
    void replaceAll_shouldFilterOutNullCompetenceIds() {
        long besoinId = 1L;
        BesoinCompetenceDTO dtoWithCompetence = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        BesoinCompetenceDTO dtoWithoutCompetence = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .competenceId(null)
                .competenceNom("Invalid")
                .build();

        BesoinCompetence saved = BesoinCompetence.builder()
                .id(1L)
                .besoinId(besoinId)
                .competenceId(20L)
                .competenceNom("Java")
                .build();

        when(repository.saveAll(anyList())).thenReturn(Arrays.asList(saved));

        List<BesoinCompetenceDTO> result = service.replaceAll(besoinId, Arrays.asList(dtoWithCompetence, dtoWithoutCompetence));

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Java", result.get(0).getCompetenceNom());
        verify(repository).deleteByBesoinId(besoinId);
        verify(repository).saveAll(anyList());
    }

    @Test
    void replaceAll_withEmptyList_shouldOnlyDelete() {
        long besoinId = 1L;
        when(repository.saveAll(anyList())).thenReturn(Collections.emptyList());

        List<BesoinCompetenceDTO> result = service.replaceAll(besoinId, Collections.emptyList());

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(repository).deleteByBesoinId(besoinId);
        verify(repository).saveAll(anyList());
    }

    @Test
    void replaceAll_shouldPreserveAllCompetenceFields() {
        long besoinId = 1L;
        BesoinCompetenceDTO dto = BesoinCompetenceDTO.builder()
                .besoinId(besoinId)
                .domaineId(10L)
                .competenceId(20L)
                .competenceNom("Java")
                .savoirId(30L)
                .savoirNom("OOP")
                .sousCompetenceId(40L)
                .build();

        BesoinCompetence saved = BesoinCompetence.builder()
                .id(1L)
                .besoinId(besoinId)
                .domaineId(10L)
                .competenceId(20L)
                .competenceNom("Java")
                .savoirId(30L)
                .savoirNom("OOP")
                .sousCompetenceId(40L)
                .build();

        when(repository.saveAll(anyList())).thenReturn(Arrays.asList(saved));

        List<BesoinCompetenceDTO> result = service.replaceAll(besoinId, Arrays.asList(dto));

        assertEquals(1, result.size());
        BesoinCompetenceDTO resultDto = result.get(0);
        assertEquals(besoinId, resultDto.getBesoinId());
        assertEquals(10L, resultDto.getDomaineId());
        assertEquals(20L, resultDto.getCompetenceId());
        assertEquals("Java", resultDto.getCompetenceNom());
        assertEquals(30L, resultDto.getSavoirId());
        assertEquals("OOP", resultDto.getSavoirNom());
        assertEquals(40L, resultDto.getSousCompetenceId());
    }
}
