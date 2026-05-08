package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.SeanceDTO;
import esprit.pfe.serviceformation.Entities.SeanceFormation;
import esprit.pfe.serviceformation.Repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.Utils.ValidationUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Time;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeanceServiceTest {

    @Mock
    private SeanceFormationRepository seanceRepo;

    @Mock
    private ValidationUtils validation;

    @InjectMocks
    private SeanceService seanceService;

    private SeanceFormation seance;
    private SeanceDTO seanceDto;

    @BeforeEach
    void setUp() {
        seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setDateSeance(new Date());
        seance.setHeureDebut(Time.valueOf("09:00:00"));
        seance.setHeureFin(Time.valueOf("11:00:00"));
        seance.setAnimateurs(new ArrayList<>());
        seance.setParticipants(new ArrayList<>());

        seanceDto = new SeanceDTO();
        seanceDto.setIdSeance(1L);
        seanceDto.setDateSeance(seance.getDateSeance());
        seanceDto.setHeureDebut(seance.getHeureDebut());
        seanceDto.setHeureFin(seance.getHeureFin());
        seanceDto.setAnimateurs(new ArrayList<>());
        seanceDto.setParticipants(new ArrayList<>());
    }

    @Test
    void getSeanceById_WithValidId_ShouldReturnDto() {
        // Arrange
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(seance));

        // Act
        SeanceDTO result = seanceService.getSeanceById(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getIdSeance());
        verify(validation).validId(1L, "seanceId");
    }

    @Test
    void getSeanceById_WithInvalidId_ShouldThrowException() {
        // Arrange
        when(seanceRepo.findById(99L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> seanceService.getSeanceById(99L));
    }

    @Test
    void deleteSeance_WithValidId_ShouldCallDelete() {
        // Arrange
        when(seanceRepo.findById(1L)).thenReturn(Optional.of(seance));

        // Act
        seanceService.deleteSeance(1L);

        // Assert
        verify(seanceRepo).delete(seance);
        verify(validation).validId(1L, "seanceId");
    }

    @Test
    void createSeance_WithNoConflicts_ShouldSaveSeance() {
        // Arrange
        when(seanceRepo.save(any(SeanceFormation.class))).thenReturn(seance);

        // Act
        SeanceDTO result = seanceService.createSeance(seanceDto);

        // Assert
        assertNotNull(result);
        verify(seanceRepo).save(any(SeanceFormation.class));
    }
}
