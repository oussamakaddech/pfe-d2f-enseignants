package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.dto.calendar.ConflictReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ImportReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ImportRowErrorDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedCalendarDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedParticipantDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedSessionDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationParticipantEmail;
import esprit.pfe.serviceformation.entities.ImportLog;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.exception.ExcelImportException;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.ImportLogRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.Month;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkshopCalendarImportService")
class WorkshopCalendarImportServiceTest {

    @Mock private WorkshopCalendarParser parser;
    @Mock private CalendarConflictService conflictService;
    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceRepository;
    @Mock private FormationParticipantEmailRepository participantEmailRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private ImportLogRepository importLogRepository;
    @Mock private CalendarProperties properties;

    @InjectMocks private WorkshopCalendarImportService service;

    private CalendarProperties.ImportSettings importSettings;

    @BeforeEach
    void setUp() {
        importSettings = new CalendarProperties.ImportSettings();
        importSettings.setMaxFileSizeBytes(10 * 1024 * 1024);
        when(properties.getImport()).thenReturn(importSettings);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("testuser@test.com", null));
    }

    // ───────────────────── preview() ─────────────────────

    @Test
    @DisplayName("preview() returns parsed calendar on valid file")
    void preview_validFile_returnsParsedCalendar() {
        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10))))
                .participants(List.of(participant("Java", "a@test.com")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        MultipartFile file = xlsxMultipartFile();

        ParsedCalendarDTO result = service.preview(file);

        assertThat(result.getSessions()).hasSize(1);
        assertThat(result.getParticipants()).hasSize(1);
        verify(parser).parse(any());
    }

    @Test
    @DisplayName("preview() throws ExcelImportException for null file")
    void preview_nullFile_throwsException() {
        assertThatThrownBy(() -> service.preview(null))
                .isInstanceOf(ExcelImportException.class);
    }

    @Test
    @DisplayName("preview() throws ExcelImportException for empty file")
    void preview_emptyFile_throwsException() {
        MultipartFile empty = new MockMultipartFile(
                "file", "test.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[0]);

        assertThatThrownBy(() -> service.preview(empty))
                .isInstanceOf(ExcelImportException.class);
    }

    @Test
    @DisplayName("preview() throws when file cannot be opened as valid workbook")
    void preview_invalidContent_throwsException() {
        byte[] fakeXlsx = new byte[200];
        fakeXlsx[0] = 0x50; // P
        fakeXlsx[1] = 0x4B; // K
        fakeXlsx[2] = 0x03;
        fakeXlsx[3] = 0x04;

        MultipartFile badContent = new MockMultipartFile(
                "file", "test.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fakeXlsx);

        assertThatThrownBy(() -> service.preview(badContent))
                .isInstanceOf(Exception.class);
    }

    // ───────────────────── importCalendar() ─────────────────────

    @Test
    @DisplayName("importCalendar() happy path — creates formation, sessions, participants")
    void importCalendar_happyPath_createsAll() {
        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(
                        session("Java Avancé", LocalDate.of(2026, Month.JUNE, 10), 1, 3),
                        session("Java Avancé", LocalDate.of(2026, Month.JUNE, 11), 2, 3)))
                .participants(List.of(participant("Java Avancé", "alice@esprit.tn")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Java Avancé");
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java Avancé"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(formation));
        when(formationRepository.save(any(Formation.class))).thenReturn(formation);

        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(1L, "alice@esprit.tn"))
                .thenReturn(false);
        when(enseignantRepository.findByMailIgnoreCase("alice@esprit.tn"))
                .thenReturn(Optional.of(new Enseignant()));
        when(participantEmailRepository.save(any(FormationParticipantEmail.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().totalConflicts(0).build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(42L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getStatus()).isEqualTo("SUCCESS");
        assertThat(report.getFormationsCreated()).isEqualTo(1);
        assertThat(report.getSessionsCreated()).isEqualTo(2);
        assertThat(report.getParticipantsImported()).isEqualTo(1);
        assertThat(report.getImportLogId()).isEqualTo(42L);
        verify(conflictService).detectAndLog(anyList(), eq(42L));
    }

    @Test
    @DisplayName("importCalendar() returns DUPLICATE when same file already imported (non-FAILED)")
    void importCalendar_duplicateHash_returnsDuplicate() {
        ImportLog existingLog = ImportLog.builder().id(10L).status("SUCCESS").build();
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.of(existingLog));

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getStatus()).isEqualTo("DUPLICATE");
        assertThat(report.getDuplicateOfImportId()).isEqualTo(10L);
        verify(parser, never()).parse(any());
    }

    @Test
    @DisplayName("importCalendar() re-imports when previous import was FAILED")
    void importCalendar_failedImport_reimports() {
        ImportLog failedLog = ImportLog.builder().id(5L).status("FAILED").build();
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.of(failedLog));

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder().build();
        when(parser.parse(any())).thenReturn(parsed);

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog newLog = ImportLog.builder().id(6L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(newLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getStatus()).isNotEqualTo("DUPLICATE");
        verify(parser).parse(any());
    }

    @Test
    @DisplayName("importCalendar() sets FAILED status when no sessions and no formations created")
    void importCalendar_emptyParsed_setsFailedStatus() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder().build();
        when(parser.parse(any())).thenReturn(parsed);

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getStatus()).isEqualTo("FAILED");
        ArgumentCaptor<ImportLog> captor = ArgumentCaptor.forClass(ImportLog.class);
        verify(importLogRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("FAILED");
    }

    @Test
    @DisplayName("importCalendar() sets PARTIAL status when parse errors exist")
    void importCalendar_withErrors_setsPartialStatus() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        List<ImportRowErrorDTO> errors = new ArrayList<>();
        errors.add(ImportRowErrorDTO.error(3, "date", "Invalid date"));

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .errors(errors)
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.empty());
        when(formationRepository.save(any(Formation.class))).thenReturn(formation);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getStatus()).isEqualTo("PARTIAL");
        assertThat(report.getErrors()).hasSize(1);
    }

    @Test
    @DisplayName("importCalendar() sets PARTIAL status when rows are skipped")
    void importCalendar_withSkippedRows_setsPartialStatus() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .participants(List.of(participant("Java", "a@test.com")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));

        // Duplicate session — will be skipped
        SeanceFormation existing = new SeanceFormation();
        existing.setDateSeance(LocalDate.of(2026, Month.JUNE, 10));
        existing.setNumeroSeance(1);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(List.of(existing));

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getRowsSkipped()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("importCalendar() sets PARTIAL when conflicts detected")
    void importCalendar_withConflicts_setsPartialStatus() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.empty());
        when(formationRepository.save(any(Formation.class))).thenReturn(formation);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().totalConflicts(2).build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getStatus()).isEqualTo("PARTIAL");
        assertThat(report.getConflictsDetected()).isEqualTo(2);
    }

    @Test
    @DisplayName("importCalendar() skips duplicate session (same business key)")
    void importCalendar_duplicateSession_skipsRow() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(
                        session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1),
                        session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));

        SeanceFormation existing = new SeanceFormation();
        existing.setDateSeance(LocalDate.of(2026, Month.JUNE, 10));
        existing.setNumeroSeance(1);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(List.of(existing));

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getRowsSkipped()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("importCalendar() creates new formation when not found")
    void importCalendar_newFormation_createsAndPersists() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("New Formation", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("New Formation"))
                .thenReturn(Optional.empty());

        Formation saved = new Formation();
        saved.setIdFormation(2L);
        saved.setTitreFormation("New Formation");
        when(formationRepository.save(any(Formation.class))).thenReturn(saved);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(2L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getFormationsCreated()).isEqualTo(1);
        verify(formationRepository).save(any(Formation.class));
    }

    @Test
    @DisplayName("importCalendar() reuses existing formation when found by title")
    void importCalendar_existingFormation_reuses() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Existing", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation existing = new Formation();
        existing.setIdFormation(5L);
        existing.setTitreFormation("Existing");
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Existing"))
                .thenReturn(Optional.of(existing));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(5L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getFormationsCreated()).isZero();
        verify(formationRepository, never()).save(any(Formation.class));
    }

    @Test
    @DisplayName("importCalendar() processes multiple participants")
    void importCalendar_multipleParticipants_persistsAll() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .participants(List.of(
                        participant("Java", "alice@esprit.tn"),
                        participant("Java", "bob@esprit.tn")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(1L, "alice@esprit.tn"))
                .thenReturn(false);
        when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(1L, "bob@esprit.tn"))
                .thenReturn(false);
        when(enseignantRepository.findByMailIgnoreCase("alice@esprit.tn"))
                .thenReturn(Optional.of(new Enseignant()));
        when(enseignantRepository.findByMailIgnoreCase("bob@esprit.tn"))
                .thenReturn(Optional.empty());
        when(participantEmailRepository.save(any(FormationParticipantEmail.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getParticipantsImported()).isEqualTo(2);
        verify(participantEmailRepository, times(2)).save(any(FormationParticipantEmail.class));
    }

    @Test
    @DisplayName("importCalendar() skips duplicate participant email")
    void importCalendar_duplicateParticipant_skips() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .participants(List.of(participant("Java", "a@test.com")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(1L, "a@test.com"))
                .thenReturn(true);

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getParticipantsImported()).isZero();
        verify(participantEmailRepository, never()).save(any(FormationParticipantEmail.class));
    }

    @Test
    @DisplayName("importCalendar() adds warning when participant section has no matching formation")
    void importCalendar_participantWithoutFormation_addsWarning() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .participants(List.of(participant("NonExistent", "orphan@esprit.tn")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("NonExistent"))
                .thenReturn(Optional.empty());

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getParticipantsImported()).isZero();
        assertThat(report.getErrors()).anyMatch(
                e -> e.getMessage().contains("Section participant sans formation"));
    }

    @Test
    @DisplayName("importCalendar() marks unmatched participants")
    void importCalendar_unmatchedParticipant_incrementsCounter() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .participants(List.of(participant("Java", "unknown@esprit.tn")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(1L, "unknown@esprit.tn"))
                .thenReturn(false);
        when(enseignantRepository.findByMailIgnoreCase("unknown@esprit.tn"))
                .thenReturn(Optional.empty());
        when(participantEmailRepository.save(any(FormationParticipantEmail.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getParticipantsUnmatched()).isEqualTo(1);
        assertThat(report.getParticipantsImported()).isEqualTo(1);

        ArgumentCaptor<FormationParticipantEmail> captor =
                ArgumentCaptor.forClass(FormationParticipantEmail.class);
        verify(participantEmailRepository).save(captor.capture());
        assertThat(captor.getValue().isMatchedEnseignant()).isFalse();
    }

    @Test
    @DisplayName("importCalendar() sets matchedEnseignant when teacher found")
    void importCalendar_matchedParticipant_setsMatchedFlag() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .participants(List.of(participant("Java", "known@esprit.tn")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(1L, "known@esprit.tn"))
                .thenReturn(false);
        Enseignant enseignant = new Enseignant();
        when(enseignantRepository.findByMailIgnoreCase("known@esprit.tn"))
                .thenReturn(Optional.of(enseignant));
        when(participantEmailRepository.save(any(FormationParticipantEmail.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getParticipantsUnmatched()).isZero();

        ArgumentCaptor<FormationParticipantEmail> captor =
                ArgumentCaptor.forClass(FormationParticipantEmail.class);
        verify(participantEmailRepository).save(captor.capture());
        assertThat(captor.getValue().isMatchedEnseignant()).isTrue();
    }

    @Test
    @DisplayName("importCalendar() passes empty participants list gracefully")
    void importCalendar_noParticipants_succeeds() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .participants(Collections.emptyList())
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getParticipantsImported()).isZero();
        verify(participantEmailRepository, never()).existsByFormationIdAndEmailIgnoreCase(anyLong(), anyString());
    }

    @Test
    @DisplayName("importCalendar() persists import log with correct counts")
    void importCalendar_persistsImportLog_withCorrectCounts() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(
                        session("F1", LocalDate.of(2026, Month.JUNE, 10), 1, 1),
                        session("F2", LocalDate.of(2026, Month.JUNE, 11), 1, 1)))
                .participants(List.of(participant("F1", "a@test.com")))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation f1 = new Formation();
        f1.setIdFormation(1L);
        Formation f2 = new Formation();
        f2.setIdFormation(2L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("F1"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(f1));
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("F2"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(f2));
        when(formationRepository.save(any(Formation.class))).thenReturn(f1).thenReturn(f2);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(1L, "a@test.com"))
                .thenReturn(false);
        when(enseignantRepository.findByMailIgnoreCase("a@test.com"))
                .thenReturn(Optional.of(new Enseignant()));
        when(participantEmailRepository.save(any(FormationParticipantEmail.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().totalConflicts(1).build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        service.importCalendar(xlsxMultipartFile(), false);

        ArgumentCaptor<ImportLog> captor = ArgumentCaptor.forClass(ImportLog.class);
        verify(importLogRepository).save(captor.capture());
        ImportLog saved = captor.getValue();
        assertThat(saved.getFormationsCreated()).isEqualTo(2);
        assertThat(saved.getSessionsCreated()).isEqualTo(2);
        assertThat(saved.getParticipantsImported()).isEqualTo(1);
        assertThat(saved.getConflictsDetected()).isEqualTo(1);
        assertThat(saved.getImportedBy()).isEqualTo("testuser@test.com");
        assertThat(saved.getFileName()).isEqualTo("calendar.xlsx");
    }

    @Test
    @DisplayName("importCalendar() handles sessions with null room gracefully")
    void importCalendar_nullRoom_succeeds() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedSessionDTO session = ParsedSessionDTO.builder()
                .formationName("Java")
                .date(LocalDate.of(2026, Month.JUNE, 10))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .sessionNumber(1)
                .totalSessions(1)
                .room("")
                .status("TEAMS")
                .trainerName("Trainer")
                .build();

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getSessionsCreated()).isEqualTo(1);
        ArgumentCaptor<SeanceFormation> captor = ArgumentCaptor.forClass(SeanceFormation.class);
        verify(seanceRepository).save(captor.capture());
        assertThat(captor.getValue().getSalle()).isNull();
    }

    @Test
    @DisplayName("importCalendar() sets formation metadata correctly on create")
    void importCalendar_newFormation_setsMetadata() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedSessionDTO session = ParsedSessionDTO.builder()
                .formationName("New Course")
                .trainerName("Dr. Smith")
                .room("Room A")
                .date(LocalDate.of(2026, Month.JUNE, 15))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .sessionNumber(1)
                .totalSessions(2)
                .build();

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("New Course"))
                .thenReturn(Optional.empty());

        Formation saved = new Formation();
        saved.setIdFormation(1L);
        when(formationRepository.save(any(Formation.class))).thenReturn(saved);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        service.importCalendar(xlsxMultipartFile(), false);

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(formationRepository).save(captor.capture());
        Formation created = captor.getValue();
        assertThat(created.getTitreFormation()).isEqualTo("New Course");
        assertThat(created.getResponsableName()).isEqualTo("Dr. Smith");
        assertThat(created.getSalle()).isEqualTo("Room A");
        assertThat(created.getEtatFormation()).isEqualTo(esprit.pfe.serviceformation.entities.EtatFormation.PLANIFIE);
        assertThat(created.getTypeFormation()).isEqualTo(esprit.pfe.serviceformation.entities.TypeFormation.INTERNE);
        assertThat(created.isCertifGenerated()).isFalse();
    }

    @Test
    @DisplayName("importCalendar() sets FAILED import log status when 0 sessions and 0 formations")
    void importCalendar_failedLog_setsFailedStatus() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder().build();
        when(parser.parse(any())).thenReturn(parsed);

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        service.importCalendar(xlsxMultipartFile(), false);

        ArgumentCaptor<ImportLog> captor = ArgumentCaptor.forClass(ImportLog.class);
        verify(importLogRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("FAILED");
    }

    @Test
    @DisplayName("importCalendar() sets PARTIAL import log when errors present")
    void importCalendar_partialLog_setsPartialStatus() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        List<ImportRowErrorDTO> errors = new ArrayList<>();
        errors.add(ImportRowErrorDTO.error(5, "date", "bad date"));

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .errors(errors)
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        service.importCalendar(xlsxMultipartFile(), false);

        ArgumentCaptor<ImportLog> captor = ArgumentCaptor.forClass(ImportLog.class);
        verify(importLogRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("PARTIAL");
    }

    @Test
    @DisplayName("importCalendar() sets SUCCESS import log when no errors, skips, or conflicts")
    void importCalendar_successLog_setsSuccessStatus() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getStatus()).isEqualTo("SUCCESS");
        ArgumentCaptor<ImportLog> captor = ArgumentCaptor.forClass(ImportLog.class);
        verify(importLogRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("importCalendar() calls conflictService.detectAndLog with saved import log id")
    void importCalendar_callsDetectAndLog_withImportLogId() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(Collections.emptyList());
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        ConflictReportDTO report = ConflictReportDTO.builder().totalConflicts(1).build();
        when(conflictService.detect(anyList())).thenReturn(report);
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(99L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        service.importCalendar(xlsxMultipartFile(), false);

        verify(conflictService).detectAndLog(anyList(), eq(99L));
    }

    @Test
    @DisplayName("importCalendar() handles parse errors from parser in report")
    void importCalendar_parseErrors_includedInReport() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        List<ImportRowErrorDTO> errors = List.of(
                ImportRowErrorDTO.error(2, "time", "Invalid time format"),
                ImportRowErrorDTO.warning(4, "status", "Unknown status"));

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .errors(new ArrayList<>(errors))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getErrors()).hasSize(2);
        assertThat(report.getErrors().get(0).getSeverity()).isEqualTo("ERROR");
        assertThat(report.getErrors().get(1).getSeverity()).isEqualTo("WARNING");
    }

    @Test
    @DisplayName("importCalendar() sets fileName on report")
    void importCalendar_setsFileNameOnReport() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());
        when(parser.parse(any())).thenReturn(ParsedCalendarDTO.builder().build());

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getFileName()).isEqualTo("calendar.xlsx");
    }

    // ───────────────────── validate() (via preview/importCalendar) ─────────────────────

    @Test
    @DisplayName("validate() throws ExcelImportException for null content type")
    void validate_nullContentType_throwsException() {
        MultipartFile file = new MockMultipartFile(
                "file", "test.xlsx", null, "content".getBytes());

        assertThatThrownBy(() -> service.preview(file))
                .isInstanceOf(ExcelImportException.class);
    }

    @Test
    @DisplayName("validate() throws ExcelImportException for wrong MIME type")
    void validate_wrongMimeType_throwsException() {
        MultipartFile file = new MockMultipartFile(
                "file", "test.pdf", "application/pdf", "content".getBytes());

        assertThatThrownBy(() -> service.preview(file))
                .isInstanceOf(ExcelImportException.class);
    }

    @Test
    @DisplayName("validate() throws ExcelImportException for file exceeding max size")
    void validate_fileTooLarge_throwsException() {
        CalendarProperties.ImportSettings smallMax = new CalendarProperties.ImportSettings();
        smallMax.setMaxFileSizeBytes(100);
        when(properties.getImport()).thenReturn(smallMax);

        MultipartFile file = new MockMultipartFile(
                "file", "large.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[200]);

        assertThatThrownBy(() -> service.preview(file))
                .isInstanceOf(ExcelImportException.class);
    }

    // ───────────────────── sameBusinessKey edge cases ─────────────────────

    @Test
    @DisplayName("importCalendar() does not skip session when existing date is null")
    void importCalendar_existingDateNull_doesNotSkip() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 1, 1)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));

        SeanceFormation existing = new SeanceFormation();
        existing.setDateSeance(null);
        existing.setNumeroSeance(1);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(List.of(existing));
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getSessionsCreated()).isEqualTo(1);
    }

    @Test
    @DisplayName("importCalendar() does not skip when session numbers differ")
    void importCalendar_differentSessionNumber_doesNotSkip() {
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString()))
                .thenReturn(Optional.empty());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(List.of(session("Java", LocalDate.of(2026, Month.JUNE, 10), 2, 3)))
                .build();
        when(parser.parse(any())).thenReturn(parsed);

        Formation formation = new Formation();
        formation.setIdFormation(1L);
        when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Java"))
                .thenReturn(Optional.of(formation));

        SeanceFormation existing = new SeanceFormation();
        existing.setDateSeance(LocalDate.of(2026, Month.JUNE, 10));
        existing.setNumeroSeance(1);
        when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(1L))
                .thenReturn(List.of(existing));
        when(seanceRepository.save(any(SeanceFormation.class)))
                .thenAnswer(invocation -> {
                    SeanceFormation s = invocation.getArgument(0);
                    s.setIdSeance(1L);
                    return s;
                });

        when(conflictService.detect(anyList()))
                .thenReturn(ConflictReportDTO.builder().build());
        when(conflictService.detectAndLog(anyList(), anyLong()))
                .thenReturn(ConflictReportDTO.builder().build());

        ImportLog importLog = ImportLog.builder().id(1L).build();
        when(importLogRepository.save(any(ImportLog.class))).thenReturn(importLog);

        ImportReportDTO report = service.importCalendar(xlsxMultipartFile(), false);

        assertThat(report.getSessionsCreated()).isEqualTo(1);
    }

    // ───────────────────── Helpers ─────────────────────

    private MultipartFile xlsxMultipartFile() {
        return new MockMultipartFile(
                "file", "calendar.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                validXlsxBytes());
    }

    private byte[] validXlsxBytes() {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.createSheet("Planning");
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private ParsedSessionDTO session(String formationName, LocalDate date) {
        return session(formationName, date, 1, 1);
    }

    private ParsedSessionDTO session(String formationName, LocalDate date,
                                     int sessionNumber, int totalSessions) {
        return ParsedSessionDTO.builder()
                .formationName(formationName)
                .date(date)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .sessionNumber(sessionNumber)
                .totalSessions(totalSessions)
                .room("Room A")
                .status("TEAMS")
                .trainerName("Trainer")
                .sourceRow(2)
                .build();
    }

    private ParsedParticipantDTO participant(String formationName, String email) {
        return ParsedParticipantDTO.builder()
                .formationName(formationName)
                .email(email)
                .sourceRow(10)
                .build();
    }
}
