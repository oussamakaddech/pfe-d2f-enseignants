package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.dto.calendar.ConflictReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ImportReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ImportRowErrorDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedCalendarDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedParticipantDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedSessionDTO;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.ImportLog;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.exception.ExcelImportException;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.ImportLogRepository;
import esprit.pfe.serviceformation.repositories.RoomConflictLogRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.utils.FileSecurityValidator;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.Month;
import java.time.LocalTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkshopCalendarImportServiceLineCoverageTest {

    @Mock private WorkshopCalendarParser parser;
    @Mock private CalendarConflictService conflictService;
    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceRepository;
    @Mock private FormationParticipantEmailRepository participantEmailRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private ImportLogRepository importLogRepository;
    @Mock private RoomConflictLogRepository roomConflictLogRepository;
    @Mock private CalendarProperties properties;
    @InjectMocks private WorkshopCalendarImportService service;

    private CalendarProperties.ImportSettings importSettings;

    @BeforeEach
    void setUp() {
        importSettings = new CalendarProperties.ImportSettings();
        importSettings.setMaxFileSizeBytes(10 * 1024 * 1024);
        when(properties.getImport()).thenReturn(importSettings);
    }

    // ==================== helpers ====================

    private MultipartFile validXlsx() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (Workbook wb = new XSSFWorkbook()) {
            wb.createSheet("Test");
            wb.write(baos);
        }
        return new MockMultipartFile("calendrier.xlsx",
                "calendrier.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                baos.toByteArray());
    }

    private ParsedSessionDTO parsedSession(String formationName, LocalDate date, LocalTime start, LocalTime end,
                                            Integer sessionNum, Integer totalSessions) {
        return ParsedSessionDTO.builder()
                .formationName(formationName)
                .trainerName("Trainer")
                .room("S1")
                .status("TEAMS")
                .date(date)
                .startTime(start)
                .endTime(end)
                .sessionNumber(sessionNum)
                .totalSessions(totalSessions)
                .sourceRow(2)
                .build();
    }

    private ParsedParticipantDTO parsedParticipant(String formationName, String email) {
        return ParsedParticipantDTO.builder()
                .formationName(formationName)
                .email(email)
                .sourceRow(5)
                .build();
    }

    private void mockSecurityContext() {
        SecurityContext secCtx = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("testuser");
        when(secCtx.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(secCtx);
    }

    private void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    // ==================== preview ====================

    @Test
    void preview_happyPath() throws IOException {
        MultipartFile file = validXlsx();
        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder().build();
        when(parser.parse(any(Workbook.class))).thenReturn(parsed);

        ParsedCalendarDTO result = service.preview(file);

        assertThat(result).isNotNull();
        verify(parser).parse(any(Workbook.class));
    }

    @Test
    void preview_ioException_throws() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getInputStream()).thenThrow(new IOException("IO error"));

        try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
            validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
            assertThatThrownBy(() -> service.preview(file))
                    .isInstanceOf(ExcelImportException.class)
                    .hasMessageContaining("Lecture du fichier impossible");
        }
    }

    // ==================== importCalendar ====================

    @Test
    void importCalendar_happyPath() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report).isNotNull();
                verify(conflictService).detect(any());
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_duplicateFile_notForced() throws IOException {
        MultipartFile file = validXlsx();
        ImportLog existing = new ImportLog();
        existing.setId(42L);
        existing.setStatus("SUCCESS");
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString())).thenReturn(Optional.of(existing));

        try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
            validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
            ImportReportDTO report = service.importCalendar(file, false);

            assertThat(report.getStatus()).isEqualTo("DUPLICATE");
            assertThat(report.getDuplicateOfImportId()).isEqualTo(42L);
        }
    }

    @Test
    void importCalendar_duplicateFile_forced_cleansUp() throws IOException {
        MultipartFile file = validXlsx();
        ImportLog existing = new ImportLog();
        existing.setId(42L);
        existing.setStatus("SUCCESS");
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString())).thenReturn(Optional.of(existing));
        when(roomConflictLogRepository.findByImportLogId(42L)).thenReturn(new ArrayList<>());

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(new ArrayList<>())
                .participants(new ArrayList<>())
                .errors(new ArrayList<>())
                .build();
        when(parser.parse(any(Workbook.class))).thenReturn(parsed);
        when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
        when(importLogRepository.save(any())).thenAnswer(inv -> {
            ImportLog log = inv.getArgument(0);
            log.setId(1L);
            return log;
        });

        try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
            validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
            ImportReportDTO report = service.importCalendar(file, true);

            assertThat(report).isNotNull();
            verify(importLogRepository).deleteById(42L);
        }
    }

    @Test
    void importCalendar_duplicateFailedStatus_continuesImport() throws IOException {
        MultipartFile file = validXlsx();
        ImportLog existing = new ImportLog();
        existing.setId(42L);
        existing.setStatus("FAILED");
        when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString())).thenReturn(Optional.of(existing));

        ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                .sessions(new ArrayList<>())
                .participants(new ArrayList<>())
                .errors(new ArrayList<>())
                .build();
        when(parser.parse(any(Workbook.class))).thenReturn(parsed);
        when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
        when(importLogRepository.save(any())).thenAnswer(inv -> {
            ImportLog log = inv.getArgument(0);
            log.setId(1L);
            return log;
        });

        try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
            validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
            ImportReportDTO report = service.importCalendar(file, false);

            assertThat(report).isNotNull();
        }
    }

    @Test
    void importCalendar_ioException_throws() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getBytes()).thenThrow(new IOException("IO error"));

        try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
            validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
            assertThatThrownBy(() -> service.importCalendar(file, false))
                    .isInstanceOf(ExcelImportException.class)
                    .hasMessageContaining("Lecture du fichier impossible");
        }
    }

    // ==================== persistSessions ====================

    @Test
    void importCalendar_newFormation_created() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 3);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getFormationsCreated()).isEqualTo(1);
                assertThat(report.getSessionsCreated()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_existingFormation_reused() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 3);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            existing.setTitreFormation("Formation A");
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(10L))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getFormationsCreated()).isZero();
                verify(formationRepository, never()).save(any(Formation.class));
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_duplicateBusinessKey_skipped() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 3);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));

            SeanceFormation existingSeance = new SeanceFormation();
            existingSeance.setDateSeance(LocalDate.of(2025, Month.JUNE, 1));
            existingSeance.setNumeroSeance(1);
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(10L))
                    .thenReturn(List.of(existingSeance));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getRowsSkipped()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_duplicateBusinessKey_nullExistingDate() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 3);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));

            SeanceFormation existingSeance = new SeanceFormation();
            existingSeance.setDateSeance(null);
            existingSeance.setNumeroSeance(1);
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(10L))
                    .thenReturn(List.of(existingSeance));
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getSessionsCreated()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== persistParticipants ====================

    @Test
    void importCalendar_participantMatched() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedParticipantDTO participant = parsedParticipant("Formation A", "test@esprit.tn");
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(List.of(participant))
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));
            when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(10L, "test@esprit.tn"))
                    .thenReturn(false);
            when(enseignantRepository.findByMailIgnoreCase("test@esprit.tn")).thenReturn(Optional.of(new esprit.pfe.serviceformation.entities.Enseignant()));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getParticipantsImported()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_participantUnmatched() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedParticipantDTO participant = parsedParticipant("Formation A", "unknown@esprit.tn");
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(List.of(participant))
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));
            when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(10L, "unknown@esprit.tn"))
                    .thenReturn(false);
            when(enseignantRepository.findByMailIgnoreCase("unknown@esprit.tn")).thenReturn(Optional.empty());
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getParticipantsUnmatched()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_participantDuplicateEmail_skipped() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedParticipantDTO participant = parsedParticipant("Formation A", "test@esprit.tn");
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(List.of(participant))
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));
            when(participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(10L, "test@esprit.tn"))
                    .thenReturn(true);
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getRowsSkipped()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_participantNoFormation() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedParticipantDTO participant = parsedParticipant("NonExistent", "test@esprit.tn");
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(List.of(participant))
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("NonExistent"))
                    .thenReturn(Optional.empty());
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getErrors()).anyMatch(e -> "WARNING".equals(e.getSeverity()));
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== saveImportLog status ====================

    @Test
    void importCalendar_statusFailed_noSessionsNoFormations() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getStatus()).isEqualTo("FAILED");
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_statusPartial_withErrors() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            List<ImportRowErrorDTO> errors = new ArrayList<>();
            errors.add(ImportRowErrorDTO.error(1, "date", "bad date"));
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(new ArrayList<>())
                    .errors(errors)
                    .build();
            // Add a session so formationsCreated > 0
            parsed.getSessions().add(parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 1));
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getStatus()).isEqualTo("PARTIAL");
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_statusPartial_withConflicts() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 1);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            ConflictReportDTO conflictReport = ConflictReportDTO.builder()
                    .totalConflicts(2)
                    .build();
            when(conflictService.detect(any())).thenReturn(conflictReport);
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getStatus()).isEqualTo("PARTIAL");
                assertThat(report.getConflictsDetected()).isEqualTo(2);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_statusPartial_withSkipped() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session1 = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 1);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session1))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            SeanceFormation existingSeance = new SeanceFormation();
            existingSeance.setDateSeance(LocalDate.of(2025, Month.JUNE, 1));
            existingSeance.setNumeroSeance(1);
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(List.of(existingSeance));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getStatus()).isEqualTo("PARTIAL");
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== currentUser ====================

    @Test
    void importCalendar_nullAuth() throws IOException {
        SecurityContext secCtx = mock(SecurityContext.class);
        when(secCtx.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(secCtx);
        try {
            MultipartFile file = validXlsx();
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report).isNotNull();
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== validate ====================

    @Test
    void preview_invalidFile_throws() {
        MultipartFile file = mock(MultipartFile.class);

        try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
            validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong()))
                    .thenReturn("Type de fichier non autorise");
            assertThatThrownBy(() -> service.preview(file))
                    .isInstanceOf(ExcelImportException.class);
        }
    }

    @Test
    void importCalendar_invalidFile_throws() {
        MultipartFile file = mock(MultipartFile.class);

        try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
            validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong()))
                    .thenReturn("Type de fichier non autorise");
            assertThatThrownBy(() -> service.importCalendar(file, false))
                    .isInstanceOf(ExcelImportException.class);
        }
    }

    // ==================== cleanupPreviousImport ====================

    @Test
    void importCalendar_forceWithPreviousConflicts() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ImportLog existing = new ImportLog();
            existing.setId(42L);
            existing.setStatus("SUCCESS");
            when(importLogRepository.findFirstByFileHashOrderByImportedAtDesc(anyString())).thenReturn(Optional.of(existing));

            List<esprit.pfe.serviceformation.entities.RoomConflictLog> prevLogs = new ArrayList<>();
            esprit.pfe.serviceformation.entities.RoomConflictLog log1 = new esprit.pfe.serviceformation.entities.RoomConflictLog();
            log1.setId(100L);
            prevLogs.add(log1);
            when(roomConflictLogRepository.findByImportLogId(42L)).thenReturn(prevLogs);

            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(new ArrayList<>())
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, true);

                assertThat(report).isNotNull();
                verify(roomConflictLogRepository).delete(log1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== blankToNull ====================

    @Test
    void importCalendar_blankRoom() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 1);
            session.setRoom("   ");
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getSessionsCreated()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_nullTrainerName() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 1);
            session.setTrainerName(null);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getSessionsCreated()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== sameBusinessKey ====================

    @Test
    void importCalendar_differentSessionNumber_notDuplicate() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 2, 3);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));

            SeanceFormation existingSeance = new SeanceFormation();
            existingSeance.setDateSeance(LocalDate.of(2025, Month.JUNE, 1));
            existingSeance.setNumeroSeance(1); // different session number
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(10L))
                    .thenReturn(List.of(existingSeance));
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getSessionsCreated()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    @Test
    void importCalendar_differentDate_notDuplicate() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 2),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 3);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);

            Formation existing = new Formation();
            existing.setIdFormation(10L);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.of(existing));

            SeanceFormation existingSeance = new SeanceFormation();
            existingSeance.setDateSeance(LocalDate.of(2025, Month.JUNE, 1)); // different date
            existingSeance.setNumeroSeance(1);
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(10L))
                    .thenReturn(List.of(existingSeance));
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getSessionsCreated()).isEqualTo(1);
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== multiple sessions same formation ====================

    @Test
    void importCalendar_multipleSessionsSameFormation() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO s1 = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 3);
            ParsedSessionDTO s2 = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 2),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 2, 3);
            ParsedSessionDTO s3 = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 3),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 3, 3);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(s1, s2, s3))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getFormationsCreated()).isEqualTo(1);
                assertThat(report.getSessionsCreated()).isEqualTo(3);
            }
        } finally {
            clearSecurityContext();
        }
    }

    // ==================== statusSuccess ====================

    @Test
    void importCalendar_statusSuccess() throws IOException {
        mockSecurityContext();
        try {
            MultipartFile file = validXlsx();
            ParsedSessionDTO session = parsedSession("Formation A", LocalDate.of(2025, Month.JUNE, 1),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), 1, 1);
            ParsedCalendarDTO parsed = ParsedCalendarDTO.builder()
                    .sessions(List.of(session))
                    .participants(new ArrayList<>())
                    .errors(new ArrayList<>())
                    .build();
            when(parser.parse(any(Workbook.class))).thenReturn(parsed);
            when(formationRepository.findFirstByTitreFormationOrderByIdFormationAsc("Formation A"))
                    .thenReturn(Optional.empty());
            when(formationRepository.save(any())).thenAnswer(inv -> {
                Formation f = inv.getArgument(0);
                f.setIdFormation(1L);
                return f;
            });
            when(seanceRepository.findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(anyLong()))
                    .thenReturn(new ArrayList<>());
            when(seanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(conflictService.detect(any())).thenReturn(ConflictReportDTO.builder().build());
            when(importLogRepository.save(any())).thenAnswer(inv -> {
                ImportLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            try (MockedStatic<FileSecurityValidator> validator = mockStatic(FileSecurityValidator.class)) {
                validator.when(() -> FileSecurityValidator.validate(any(), any(), anyLong())).thenReturn(null);
                ImportReportDTO report = service.importCalendar(file, false);

                assertThat(report.getStatus()).isEqualTo("SUCCESS");
            }
        } finally {
            clearSecurityContext();
        }
    }
}

