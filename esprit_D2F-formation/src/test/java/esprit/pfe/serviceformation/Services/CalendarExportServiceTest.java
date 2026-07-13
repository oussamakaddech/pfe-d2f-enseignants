package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.utils.IcsCalendarWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CalendarExportService - Tests unitaires")
class CalendarExportServiceTest {

    @Mock
    private SeanceFormationRepository seanceFormationRepository;

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private FormationParticipantEmailRepository participantEmailRepository;

    private CalendarExportService calendarExportService;

    private Formation formation;
    private SeanceFormation seance;

    @BeforeEach
    void setUp() {
        // Writer et propriétés réels : on valide ainsi le rendu .ics effectif.
        CalendarProperties properties = new CalendarProperties();
        IcsCalendarWriter icsWriter = new IcsCalendarWriter(properties);
        calendarExportService = new CalendarExportService(
                seanceFormationRepository, formationRepository,
                participantEmailRepository, icsWriter, properties);

        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Formation Java");

        seance = new SeanceFormation();
        seance.setIdSeance(100L);
        seance.setDateSeance(LocalDate.now());
        seance.setHeureDebut(LocalTime.of(9, 0));
        seance.setHeureFin(LocalTime.of(12, 0));
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
        lenient().when(seanceFormationRepository
                .findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(List.of(seance));

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

    @Test
    @DisplayName("generateIcsForAll - Devrait générer un ics pour toutes les séances")
    void shouldGenerateIcsForAll() {
        when(seanceFormationRepository.findAllByOrderByDateSeanceAscHeureDebutAsc())
                .thenReturn(List.of(seance));

        String ics = calendarExportService.generateIcsForAll();

        assertThat(ics).contains("BEGIN:VCALENDAR").contains("SUMMARY:[D2F] Formation Java");
    }

    @Test
    @DisplayName("generateIcsForParticipantEmail - Devrait générer un ics pour un participant")
    void shouldGenerateIcsForParticipantEmail() {
        when(seanceFormationRepository.findByParticipantMail("a@b.com"))
                .thenReturn(List.of(seance));
        when(participantEmailRepository.findFormationIdsByEmail("a@b.com"))
                .thenReturn(List.of());

        String ics = calendarExportService.generateIcsForParticipantEmail("a@b.com");

        assertThat(ics).contains("BEGIN:VCALENDAR");
    }

    @Test
    @DisplayName("buildEventsForFormation - Devrait construire une liste d'événements")
    void shouldBuildEventsForFormation() {
        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        when(seanceFormationRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(List.of(seance));

        var events = calendarExportService.buildEventsForFormation(1L, List.of("a@b.com"));

        assertThat(events).hasSize(1);
    }
}
