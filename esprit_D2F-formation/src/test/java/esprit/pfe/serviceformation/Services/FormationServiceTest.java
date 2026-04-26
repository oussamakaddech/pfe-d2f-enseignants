package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.TypeFormation;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FormationServiceTest {

    @Mock
    private FormationRepository formationRepository;

    @InjectMocks
    private FormationServiceImpl formationService;

    private Formation testFormation;
    private Formation updatedFormation;

    @BeforeEach
    void setUp() {
        Date startDate = new Date();
        Date endDate = new Date(startDate.getTime() + 86400000); // +1 day

        testFormation = new Formation();
        testFormation.setIdFormation(1L);
        testFormation.setTitreFormation("Formation Test");
        testFormation.setTypeFormation(TypeFormation.INTERNE);
        testFormation.setDateDebut(startDate);
        testFormation.setDateFin(endDate);
        testFormation.setEtatFormation(EtatFormation.PLANIFIEE);
        testFormation.setCoutFormation(1000.0f);
        testFormation.setChargeHoraireGlobal(20);

        updatedFormation = new Formation();
        updatedFormation.setIdFormation(1L);
        updatedFormation.setTitreFormation("Formation Test Updated");
        updatedFormation.setTypeFormation(TypeFormation.EXTERNE);
        updatedFormation.setDateDebut(startDate);
        updatedFormation.setDateFin(endDate);
        updatedFormation.setEtatFormation(EtatFormation.EN_COURS);
        updatedFormation.setCoutFormation(1500.0f);
        updatedFormation.setChargeHoraireGlobal(25);
    }

    @Test
    void testCreateFormation() {
        // Given
        when(formationRepository.save(any(Formation.class))).thenReturn(testFormation);

        // When
        Formation result = formationService.createFormation(testFormation);

        // Then
        assertNotNull(result);
        assertEquals(testFormation.getTitreFormation(), result.getTitreFormation());
        assertEquals(testFormation.getTypeFormation(), result.getTypeFormation());
        verify(formationRepository, times(1)).save(any(Formation.class));
    }

    @Test
    void testGetFormationById() {
        // Given
        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));

        // When
        Formation result = formationService.getFormationById(1L);

        // Then
        assertNotNull(result);
        assertEquals(testFormation.getIdFormation(), result.getIdFormation());
        assertEquals(testFormation.getTitreFormation(), result.getTitreFormation());
        verify(formationRepository, times(1)).findById(1L);
    }

    @Test
    void testGetFormationById_NotFound() {
        // Given
        when(formationRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, () -> formationService.getFormationById(999L));
        verify(formationRepository, times(1)).findById(999L);
    }

    @Test
    void testGetAllFormations() {
        // Given
        List<Formation> formations = Arrays.asList(testFormation, updatedFormation);
        when(formationRepository.findAll()).thenReturn(formations);

        // When
        List<Formation> result = formationService.getAllFormations();

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(testFormation.getTitreFormation(), result.get(0).getTitreFormation());
        assertEquals(updatedFormation.getTitreFormation(), result.get(1).getTitreFormation());
        verify(formationRepository, times(1)).findAll();
    }

    @Test
    void testUpdateFormation() {
        // Given
        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));
        when(formationRepository.save(any(Formation.class))).thenReturn(updatedFormation);

        // When
        Formation result = formationService.updateFormation(1L, updatedFormation);

        // Then
        assertNotNull(result);
        assertEquals(updatedFormation.getTitreFormation(), result.getTitreFormation());
        assertEquals(updatedFormation.getTypeFormation(), result.getTypeFormation());
        assertEquals(updatedFormation.getEtatFormation(), result.getEtatFormation());
        verify(formationRepository, times(1)).findById(1L);
        verify(formationRepository, times(1)).save(any(Formation.class));
    }

    @Test
    void testUpdateFormation_NotFound() {
        // Given
        when(formationRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, () -> formationService.updateFormation(999L, updatedFormation));
        verify(formationRepository, times(1)).findById(999L);
        verify(formationRepository, never()).save(any(Formation.class));
    }

    @Test
    void testDeleteFormation() {
        // Given
        doNothing().when(formationRepository).deleteById(1L);

        // When
        formationService.deleteFormation(1L);

        // Then
        verify(formationRepository, times(1)).deleteById(1L);
    }
}
