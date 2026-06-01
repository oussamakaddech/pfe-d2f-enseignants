package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationCompetence;
import esprit.pfe.serviceformation.repositories.FormationCompetenceRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FormationCompetenceServiceTest {

    @Mock private FormationCompetenceRepository repository;
    @Mock private FormationRepository formationRepository;
    @InjectMocks private FormationCompetenceService service;

    @Test
    void testGetByFormationId() {
        when(repository.findByFormationIdFormation(anyLong())).thenReturn(Collections.emptyList());
        service.getByFormationId(1L);
        verify(repository).findByFormationIdFormation(1L);
    }

    @Test
    void testGetByFormationIdPageable() {
        when(repository.findByFormationIdFormation(anyLong(), any(PageRequest.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        service.getByFormationId(1L, PageRequest.of(0, 10));
        verify(repository).findByFormationIdFormation(1L, PageRequest.of(0, 10));
    }
    
    @Test
    void testGetByCompetenceId() {
        when(repository.findByCompetenceId(anyLong())).thenReturn(Collections.emptyList());
        service.getByCompetenceId(1L);
        verify(repository).findByCompetenceId(1L);
    }

    @Test
    void testGetByCompetenceIdPageable() {
        when(repository.findByCompetenceId(anyLong(), any(PageRequest.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        service.getByCompetenceId(1L, PageRequest.of(0, 10));
        verify(repository).findByCompetenceId(1L, PageRequest.of(0, 10));
    }

    @Test
    void testGetByDomaineId() {
        when(repository.findByDomaineId(anyLong())).thenReturn(Collections.emptyList());
        service.getByDomaineId(1L);
        verify(repository).findByDomaineId(1L);
    }

    @Test
    void testGetByDomaineIdPageable() {
        when(repository.findByDomaineId(anyLong(), any(PageRequest.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        service.getByDomaineId(1L, PageRequest.of(0, 10));
        verify(repository).findByDomaineId(1L, PageRequest.of(0, 10));
    }

    @Test
    void testAddFormationCompetence() {
        when(formationRepository.findById(anyLong())).thenReturn(Optional.of(new Formation()));
        FormationCompetence fc = new FormationCompetence();
        service.addFormationCompetence(1L, fc);
        verify(repository).save(fc);
    }

    @Test
    void testAddFormationCompetence_NotFound() {
        when(formationRepository.findById(anyLong())).thenReturn(Optional.empty());
        FormationCompetence fc = new FormationCompetence();
        assertThrows(IllegalArgumentException.class, () -> service.addFormationCompetence(1L, fc));
    }

    @Test
    void testUpdateFormationCompetence() {
        FormationCompetence existing = new FormationCompetence();
        when(repository.findById(anyLong())).thenReturn(Optional.of(existing));
        FormationCompetence updated = new FormationCompetence();
        service.updateFormationCompetence(1L, updated);
        verify(repository).save(existing);
    }

    @Test
    void testUpdateFormationCompetence_NotFound() {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());
        FormationCompetence fc = new FormationCompetence();
        assertThrows(IllegalArgumentException.class, () -> service.updateFormationCompetence(1L, fc));
    }

    @Test
    void testDeleteFormationCompetence() {
        service.deleteFormationCompetence(1L);
        verify(repository).deleteById(1L);
    }

    @Test
    void testReplaceAllForFormation() {
        when(formationRepository.findById(anyLong())).thenReturn(Optional.of(new Formation()));
        List<FormationCompetence> links = List.of(new FormationCompetence());
        service.replaceAllForFormation(1L, links);
        verify(repository).deleteByFormationIdFormation(1L);
        verify(repository).saveAll(links);
    }
}
