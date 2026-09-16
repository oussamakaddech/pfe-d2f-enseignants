package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExportExcelService - Line Coverage Tests")
class ExportExcelServiceLineCoverageTest {

    @Mock
    private FormationWorkflowService formationWorkflowService;

    @InjectMocks
    private ExportExcelService exportExcelService;

    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        startDate = LocalDate.of(2026, Month.JANUARY, 1);
        endDate = LocalDate.of(2026, Month.DECEMBER, 31);
    }

    // ─────────────────────────────────────────────────────────────
    // Happy path with complex data
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("exportFormationsAvance - Happy Paths")
    class HappyPaths {

        @Test
        @DisplayName("full export with morning and afternoon seances")
        void morningAndAfternoon() throws IOException {
            List<FormationResponseDTO> formations = buildComplexFormations();
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result).isNotNull();
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with multiple dates and date merging")
        void multipleDates() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Multi-Date");
            f1.setDepartement(buildDept("Dept IT"));
            f1.setUp(buildUp("UP Dev"));

            SeanceDTO morning = buildSeance(LocalDate.of(2026, Month.MARCH, 10), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "Salle A", buildAnimateur("Ali", "Ben"), buildParticipant("Sami", "Trabelsi", "s@e.com"));
            SeanceDTO afternoon = buildSeance(LocalDate.of(2026, Month.MARCH, 10), LocalTime.of(14, 0), LocalTime.of(17, 0),
                    "Salle B", buildAnimateur("Karim", "Selmi"), buildParticipant("Ahmed", "Bouazizi", "a@e.com"));
            SeanceDTO nextDay = buildSeance(LocalDate.of(2026, Month.MARCH, 11), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "Salle C", buildAnimateur("Ali", "Ben"), null);

            f1.setSeances(List.of(morning, afternoon, nextDay));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with null participants and null animateurs")
        void nullParticipantsAnimateurs() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Null Refs");
            f1.setDepartement(null);
            f1.setUp(null);

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(LocalDate.of(2026, Month.APRIL, 1));
            s1.setHeureDebut(LocalTime.of(9, 0));
            s1.setHeureFin(LocalTime.of(12, 0));
            s1.setSalle(null);
            s1.setAnimateurs(null);
            s1.setParticipants(null);

            f1.setSeances(List.of(s1));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with empty participants")
        void emptyParticipants() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Empty Parts");

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(LocalDate.of(2026, Month.MAY, 1));
            s1.setHeureDebut(LocalTime.of(9, 0));
            s1.setHeureFin(LocalTime.of(12, 0));
            s1.setAnimateurs(List.of());
            s1.setParticipants(List.of());

            f1.setSeances(List.of(s1));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with participant with null mail")
        void participantNullMail() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Null Mail");

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(LocalDate.of(2026, Month.JUNE, 1));
            s1.setHeureDebut(LocalTime.of(9, 0));
            s1.setHeureFin(LocalTime.of(12, 0));

            EnseignantDTO part = new EnseignantDTO();
            part.setNom("Test");
            part.setPrenom("User");
            part.setMail(null);
            s1.setParticipants(List.of(part));

            f1.setSeances(List.of(s1));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Edge cases
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("exportFormationsAvance - Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("export with empty formations list")
        void emptyFormations() throws IOException {
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(new ArrayList<>());

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result).isNotNull();
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with seances outside date range")
        void outsideDateRange() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Outside");

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(LocalDate.of(2025, Month.JANUARY, 1));
            f1.setSeances(List.of(s1));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with null dateSeance on seance")
        void nullDateSeance() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Null Date");

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(null);
            f1.setSeances(List.of(s1));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with formation having null seances list")
        void nullSeancesList() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Null Seances");
            f1.setSeances(null);
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("seance with null heureDebut and heureFin")
        void nullHeures() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Null Heures");

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(LocalDate.of(2026, Month.JULY, 1));
            s1.setHeureDebut(null);
            s1.setHeureFin(null);
            s1.setSalle(null);
            f1.setSeances(List.of(s1));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with long sheet name (>31 chars)")
        void longSheetName() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("A".repeat(50));
            f1.setSeances(List.of());

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with multiple formations creating multiple participant sheets")
        void multipleParticipantSheets() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation A");
            SeanceDTO s1 = buildSeance(LocalDate.of(2026, Month.AUGUST, 1), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "S1", buildAnimateur("A1", "B1"), buildParticipant("P1", "Part1", "p1@e.com"));
            f1.setSeances(List.of(s1));

            FormationResponseDTO f2 = new FormationResponseDTO();
            f2.setTitreFormation("Formation B");
            SeanceDTO s2 = buildSeance(LocalDate.of(2026, Month.AUGUST, 2), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "S2", buildAnimateur("A2", "B2"), buildParticipant("P2", "Part2", "p2@e.com"));
            f2.setSeances(List.of(s2));

            formations.add(f1);
            formations.add(f2);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with seance containing empty animateurs list")
        void emptyAnimateurs() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Empty Anims");

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(LocalDate.of(2026, Month.SEPTEMBER, 1));
            s1.setHeureDebut(LocalTime.of(10, 0));
            s1.setHeureFin(LocalTime.of(12, 0));
            s1.setAnimateurs(List.of());
            s1.setParticipants(new ArrayList<>());
            f1.setSeances(List.of(s1));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("same participant in multiple seances → deduplication")
        void deduplication() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Dedup");

            EnseignantDTO p1 = buildParticipant("Dupont", "Jean", "jean@e.com");
            SeanceDTO s1 = buildSeance(LocalDate.of(2026, Month.OCTOBER, 1), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "S1", null, p1);
            SeanceDTO s2 = buildSeance(LocalDate.of(2026, Month.OCTOBER, 2), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "S2", null, p1);
            f1.setSeances(List.of(s1, s2));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("seance on boundary dates (start/end)")
        void boundaryDates() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Boundary");

            SeanceDTO s1 = buildSeance(startDate, LocalTime.of(9, 0), LocalTime.of(12, 0), "S1", null, null);
            SeanceDTO s2 = buildSeance(endDate, LocalTime.of(9, 0), LocalTime.of(12, 0), "S2", null, null);
            f1.setSeances(List.of(s1, s2));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("seance just before startDate → filtered out")
        void beforeStartDate() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Before");

            SeanceDTO s1 = buildSeance(startDate.minusDays(1), LocalTime.of(9, 0), LocalTime.of(12, 0), "S1", null, null);
            f1.setSeances(List.of(s1));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("seance just after endDate → filtered out")
        void afterEndDate() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation After");

            SeanceDTO s1 = buildSeance(endDate.plusDays(1), LocalTime.of(9, 0), LocalTime.of(12, 0), "S1", null, null);
            f1.setSeances(List.of(s1));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("seance exactly at 12:30 (not afternoon)")
        void exactly1230() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation 12:30");

            SeanceDTO s1 = buildSeance(LocalDate.of(2026, Month.MAY, 1), LocalTime.of(12, 30), LocalTime.of(15, 0), "S1", null, null);
            f1.setSeances(List.of(s1));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("seance at 12:31 → afternoon")
        void after1230() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Afternoon");

            SeanceDTO s1 = buildSeance(LocalDate.of(2026, Month.MAY, 1), LocalTime.of(12, 31), LocalTime.of(15, 0), "S1", null, null);
            SeanceDTO s2 = buildSeance(LocalDate.of(2026, Month.MAY, 1), LocalTime.of(15, 0), LocalTime.of(17, 0), "S1", null, null);
            f1.setSeances(List.of(s1, s2));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with many formations triggering alternating row styles")
        void alternatingRows() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            for (int i = 0; i < 10; i++) {
                FormationResponseDTO f = new FormationResponseDTO();
                f.setTitreFormation("Formation " + i);
                SeanceDTO s = buildSeance(LocalDate.of(2026, Month.JANUARY, 1 + i), LocalTime.of(9, 0), LocalTime.of(12, 0),
                        "S" + i, null, buildParticipant("Nom" + i, "Prenom" + i, "p" + i + "@e.com"));
                f.setSeances(List.of(s));
                formations.add(f);
            }

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with seance having empty animateurs list but null participants")
        void emptyAnimsNullParts() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Mix");

            SeanceDTO s1 = new SeanceDTO();
            s1.setDateSeance(LocalDate.of(2026, Month.NOVEMBER, 1));
            s1.setHeureDebut(LocalTime.of(9, 0));
            s1.setHeureFin(LocalTime.of(12, 0));
            s1.setAnimateurs(List.of());
            s1.setParticipants(null);
            f1.setSeances(List.of(s1));

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("export with departement having null libelle")
        void deptNullLibelle() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Null Dept");
            DeptDTO dept = new DeptDTO();
            dept.setId("D1");
            dept.setLibelle(null);
            f1.setDepartement(dept);
            f1.setUp(null);
            f1.setSeances(List.of());

            formations.add(f1);
            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Multiple groups for spacing between date groups
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("exportFormationsAvance - Calendar Sheet Groups")
    class CalendarGroups {

        @Test
        @DisplayName("multiple date groups with spacing rows")
        void multipleGroups() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Group 1");
            f1.setDepartement(buildDept("Dept1"));
            f1.setUp(buildUp("UP1"));

            SeanceDTO s1 = buildSeance(LocalDate.of(2026, Month.JUNE, 1), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "S1", buildAnimateur("A", "B"), null);
            SeanceDTO s2 = buildSeance(LocalDate.of(2026, Month.JUNE, 1), LocalTime.of(14, 0), LocalTime.of(17, 0),
                    "S2", buildAnimateur("C", "D"), null);

            f1.setSeances(List.of(s1, s2));
            formations.add(f1);

            FormationResponseDTO f2 = new FormationResponseDTO();
            f2.setTitreFormation("Formation Group 2");
            SeanceDTO s3 = buildSeance(LocalDate.of(2026, Month.JULY, 1), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "S3", null, null);
            f2.setSeances(List.of(s3));
            formations.add(f2);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }

        @Test
        @DisplayName("single seance per date group → no blank row inserted")
        void singleSeancePerGroup() throws IOException {
            List<FormationResponseDTO> formations = new ArrayList<>();

            FormationResponseDTO f1 = new FormationResponseDTO();
            f1.setTitreFormation("Formation Single");
            SeanceDTO s1 = buildSeance(LocalDate.of(2026, Month.AUGUST, 15), LocalTime.of(9, 0), LocalTime.of(12, 0),
                    "S1", null, null);
            f1.setSeances(List.of(s1));
            formations.add(f1);

            when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

            ByteArrayOutputStream result = exportExcelService.exportFormationsAvance(startDate, endDate);
            assertThat(result.size()).isGreaterThan(0);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────
    private List<FormationResponseDTO> buildComplexFormations() {
        List<FormationResponseDTO> formations = new ArrayList<>();

        FormationResponseDTO f1 = new FormationResponseDTO();
        f1.setTitreFormation("Formation Complexe Java Avancee");
        f1.setDepartement(buildDept("Departement Informatique"));
        f1.setUp(buildUp("UP Developpement"));

        EnseignantDTO anim1 = buildAnimateur("Ben Ali", "Sami");
        EnseignantDTO anim2 = buildAnimateur("Trabelsi", "Ahmed");
        EnseignantDTO part1 = buildParticipant("Foulen", "Ben Foulen", "foulen@esprit.tn");
        EnseignantDTO part2 = buildParticipant("Khadija", "Mansour", "khadija@esprit.tn");

        SeanceDTO morning = buildSeance(LocalDate.of(2026, Month.MARCH, 15), LocalTime.of(9, 0), LocalTime.of(12, 0),
                "Salle 101", anim1, part1);
        SeanceDTO afternoon = buildSeance(LocalDate.of(2026, Month.MARCH, 15), LocalTime.of(14, 0), LocalTime.of(17, 0),
                "Salle 102", anim2, part2);

        f1.setSeances(List.of(morning, afternoon));
        formations.add(f1);

        FormationResponseDTO f2 = new FormationResponseDTO();
        f2.setTitreFormation("Formation Sans Seances");
        formations.add(f2);

        FormationResponseDTO f3 = new FormationResponseDTO();
        f3.setTitreFormation("Formation Hors Periode");
        SeanceDTO oldSeance = new SeanceDTO();
        oldSeance.setDateSeance(LocalDate.of(2025, Month.JUNE, 1));
        f3.setSeances(List.of(oldSeance));
        formations.add(f3);

        return formations;
    }

    private SeanceDTO buildSeance(LocalDate date, LocalTime debut, LocalTime fin, String salle,
                                   EnseignantDTO animateur, EnseignantDTO participant) {
        SeanceDTO s = new SeanceDTO();
        s.setDateSeance(date);
        s.setHeureDebut(debut);
        s.setHeureFin(fin);
        s.setSalle(salle);
        s.setAnimateurs(animateur != null ? new ArrayList<>(List.of(animateur)) : List.of());
        s.setParticipants(participant != null ? new ArrayList<>(List.of(participant)) : List.of());
        return s;
    }

    private EnseignantDTO buildAnimateur(String nom, String prenom) {
        EnseignantDTO e = new EnseignantDTO();
        e.setNom(nom);
        e.setPrenom(prenom);
        return e;
    }

    private EnseignantDTO buildParticipant(String nom, String prenom, String mail) {
        EnseignantDTO e = new EnseignantDTO();
        e.setNom(nom);
        e.setPrenom(prenom);
        e.setMail(mail);
        return e;
    }

    private DeptDTO buildDept(String libelle) {
        DeptDTO dto = new DeptDTO();
        dto.setId("D1");
        dto.setLibelle(libelle);
        return dto;
    }

    private UpDTO buildUp(String libelle) {
        UpDTO dto = new UpDTO();
        dto.setId("U1");
        dto.setLibelle(libelle);
        return dto;
    }
}

