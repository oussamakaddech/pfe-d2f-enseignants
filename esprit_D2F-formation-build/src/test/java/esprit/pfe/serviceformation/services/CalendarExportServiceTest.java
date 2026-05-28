package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Time;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
@DisplayName("CalendarExportService - Tests unitaires")
class CalendarExportServiceTest {

    @Mock
    private SeanceFormationRepository seanceFormationRepository;

    @Mock
    private FormationRepository formationRepository;

    @InjectMocks
    private CalendarExportService calendarExportService;

    private Formation formation;
    private SeanceFormation seance;

    @BeforeEach
    void setUp() {
        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Formation Java");

        seance = new SeanceFormation();
        seance.setIdSeance(100L);
        seance.setDateSeance(new Date());
        seance.setHeureDebut(Time.valueOf("09:00:00"));
        seance.setHeureFin(Time.valueOf("12:00:00"));
        seance.setSalle("Salle A");
        seance.setTypeSeance(esprit.pfe.serviceformation.entities.TypeSeanceEnum.THEORIQUE);
        
        Enseignant anim = new Enseignant();
        anim.setNom("Ben");
        anim.setPrenom("Ali");
        seance.setAnimateurs(List.of(anim));
        seance.setFormation(formation);
    }

    @Test
    @DisplayName("generateIcsForFormation - Devrait générer un fichier ics valide")
    void shouldGenerateIcsForFormation() {
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        lenient().when(seanceFormationRepository.findByFormation_IdFormation(1L)).thenReturn(List.of(seance));

        String ics = calendarExportService.generateIcsForFormation(1L);

        assertThat(ics).contains("BEGIN:VCALENDAR")
                .contains("SUMMARY:[D2F] Formation Java")
                .contains("LOCATION:Salle A");
    }

    @Test
    @DisplayName("generateIcsForEnseignant - Devrait générer un fichier ics pour l'enseignant")
    void shouldGenerateIcsForEnseignant() {
        lenient().when(seanceFormationRepository.findByAnimateurs_Id("E1")).thenReturn(List.of(seance));
        lenient().when(seanceFormationRepository.findByParticipants_Id("E1")).thenReturn(List.of(seance)); // Test deduplication

        String ics = calendarExportService.generateIcsForEnseignant("E1");

        assertThat(ics).contains("BEGIN:VCALENDAR")
                .contains("SUMMARY:[D2F] Formation Java");
    }
}
