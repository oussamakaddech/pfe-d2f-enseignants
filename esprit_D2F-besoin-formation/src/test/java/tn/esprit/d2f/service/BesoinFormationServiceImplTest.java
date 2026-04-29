package tn.esprit.d2f.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.DTO.BesoinFormationApprovedEvent;
import tn.esprit.d2f.DTO.BesoinFormationEventPublisher;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;
import tn.esprit.d2f.repository.BesoinFormationRepository;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BesoinFormationServiceImplTest {

    @Mock
    private BesoinFormationRepository besoinFormationRepository;

    @Mock
    private BesoinFormationEventPublisher eventPublisher;

    @InjectMocks
    private BesoinFormationServiceImpl besoinFormationService;

    private BesoinFormation besoinFormation;

    @BeforeEach
    void setUp() {
        besoinFormation = new BesoinFormation();
        besoinFormation.setTitre("Formation Spring Boot");
        besoinFormation.setObjectifFormation("Maîtriser Spring Boot");
        besoinFormation.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        besoinFormation.setPriorite(Priorite.HAUTE);
        besoinFormation.setEventPublished(false);
    }

    @Test
    void testAddBesoinFormation() {
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(besoinFormation);

        BesoinFormation savedBesoin = besoinFormationService.addBesoinFormation(besoinFormation);

        assertNotNull(savedBesoin);
        assertEquals("Formation Spring Boot", savedBesoin.getTitre());
        verify(besoinFormationRepository, times(1)).save(any(BesoinFormation.class));
    }

    @Test
    void testRetrieveAllBesoinFormations() {
        when(besoinFormationRepository.findAll()).thenReturn(Arrays.asList(besoinFormation));

        List<BesoinFormation> list = besoinFormationService.retrieveAllBesoinFormations();

        assertFalse(list.isEmpty());
        assertEquals(1, list.size());
        verify(besoinFormationRepository, times(1)).findAll();
    }

    @Test
    void testRetrieveBesoinFormation() {
        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(besoinFormation));

        BesoinFormation result = besoinFormationService.retrieveBesoinFormation(1L);

        assertNotNull(result);
        assertEquals("Formation Spring Boot", result.getTitre());
        verify(besoinFormationRepository, times(1)).findById(1L);
    }

    @Test
    void testRemoveBesoinFormation() {
        doNothing().when(besoinFormationRepository).deleteById(1L);

        besoinFormationService.removeBesoinFormation(1L);

        verify(besoinFormationRepository, times(1)).deleteById(1L);
    }

    @Test
    void testApprouverBesoin() {
        // Given
        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(besoinFormation));
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(besoinFormation);
        doNothing().when(eventPublisher).publish(any(BesoinFormationApprovedEvent.class));

        // When
        BesoinFormation result = besoinFormationService.approuverBesoin(1L);

        // Then
        assertTrue(result.getEventPublished(), "Le besoin doit être marqué comme publié");
        verify(besoinFormationRepository, times(1)).save(besoinFormation);
        verify(eventPublisher, times(1)).publish(any(BesoinFormationApprovedEvent.class));
    }

    @Test
    void testApprouverBesoinAlreadyPublished() {
        // Given
        besoinFormation.setEventPublished(true);
        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(besoinFormation));

        // When
        BesoinFormation result = besoinFormationService.approuverBesoin(1L);

        // Then
        // Save and publish should NOT be called again
        verify(besoinFormationRepository, never()).save(any(BesoinFormation.class));
        verify(eventPublisher, never()).publish(any(BesoinFormationApprovedEvent.class));
        assertTrue(result.getEventPublished());
    }
}
