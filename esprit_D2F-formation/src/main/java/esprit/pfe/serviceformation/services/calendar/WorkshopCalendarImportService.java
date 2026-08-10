package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.config.CalendarProperties;
import esprit.pfe.serviceformation.config.PiiSafeLogger;
import esprit.pfe.serviceformation.dto.calendar.ConflictReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ImportReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedCalendarDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedParticipantDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedSessionDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.FormationParticipantEmail;
import esprit.pfe.serviceformation.entities.ImportLog;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.entities.TypeFormation;
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
import org.slf4j.Logger;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Orchestration de l'import du calendrier des ateliers : validation du fichier,
 * parsing, détection de conflits, persistance idempotente et rapport détaillé.
 * <p>
 * Sécurité : seules les métadonnées agrégées sont journalisées ; les adresses
 * e-mail sont masquées via {@link PiiSafeLogger} (DSI — aucune PII en clair dans
 * les logs).
 */
@Service
public class WorkshopCalendarImportService {

    private static final String STATUS_FAILED = "FAILED";
    private static final Logger log = PiiSafeLogger.getLogger(WorkshopCalendarImportService.class);

    private static final Set<String> ALLOWED_XLSX_MIME =
            Set.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final WorkshopCalendarParser parser;
    private final CalendarConflictService conflictService;
    private final FormationRepository formationRepository;
    private final SeanceFormationRepository seanceRepository;
    private final FormationParticipantEmailRepository participantEmailRepository;
    private final EnseignantRepository enseignantRepository;
    private final ImportLogRepository importLogRepository;
    private final RoomConflictLogRepository roomConflictLogRepository;
    private final CalendarProperties properties;

    public WorkshopCalendarImportService(
            WorkshopCalendarParser parser,
            CalendarConflictService conflictService,
            FormationRepository formationRepository,
            SeanceFormationRepository seanceRepository,
            FormationParticipantEmailRepository participantEmailRepository,
            EnseignantRepository enseignantRepository,
            ImportLogRepository importLogRepository,
            RoomConflictLogRepository roomConflictLogRepository,
            CalendarProperties properties) {
        this.parser = parser;
        this.conflictService = conflictService;
        this.formationRepository = formationRepository;
        this.seanceRepository = seanceRepository;
        this.participantEmailRepository = participantEmailRepository;
        this.enseignantRepository = enseignantRepository;
        this.importLogRepository = importLogRepository;
        this.roomConflictLogRepository = roomConflictLogRepository;
        this.properties = properties;
    }

    /** Parse sans persister : aperçu + conflits détectés. */
    public ParsedCalendarDTO preview(MultipartFile file) {
        validate(file);
        try (Workbook workbook = openWorkbook(file)) {
            return parser.parse(workbook);
        } catch (IOException e) {
            throw new ExcelImportException("Lecture du fichier impossible : " + e.getMessage(), e);
        }
    }

    /** Import complet et persistant, idempotent par empreinte de fichier. */
    @Transactional
    public ImportReportDTO importCalendar(MultipartFile file, boolean force) {
        validate(file);
        byte[] content = readBytes(file);
        String hash = sha256(content);

        Optional<ImportLog> existing = importLogRepository.findFirstByFileHashOrderByImportedAtDesc(hash);
        if (existing.isPresent() && !STATUS_FAILED.equals(existing.get().getStatus())) {
            if (!force) {
                log.info("Import calendrier ignoré : fichier déjà importé (importLogId={})", existing.get().getId());
                return ImportReportDTO.builder()
                        .status("DUPLICATE")
                        .fileName(file.getOriginalFilename())
                        .duplicateOfImportId(existing.get().getId())
                        .build();
            }
            log.info("Import calendrier forcé : suppression de l'import précédent (importLogId={})", existing.get().getId());
            cleanupPreviousImport(existing.get().getId());
        }

        ParsedCalendarDTO parsed;
        try (Workbook workbook = openWorkbook(content)) {
            parsed = parser.parse(workbook);
        } catch (IOException e) {
            throw new ExcelImportException("Lecture du fichier impossible : " + e.getMessage(), e);
        }

        ImportReportDTO report = ImportReportDTO.builder()
                .fileName(file.getOriginalFilename())
                .errors(new ArrayList<>(parsed.getErrors()))
                .build();

        List<SeanceFormation> persistedSeances = persistSessions(parsed, report);
        persistParticipants(parsed, report);

        ConflictReportDTO conflicts = conflictService.detect(persistedSeances);
        report.setConflicts(conflicts);
        report.setConflictsDetected(conflicts.getTotalConflicts());

        ImportLog importLog = saveImportLog(file, hash, content.length, report);
        report.setImportLogId(importLog.getId());

        // Persistance des conflits liés à cet import.
        conflictService.detectAndLog(persistedSeances, importLog.getId());

        report.setStatus(resolveStatus(report));
        log.info("Import calendrier terminé : {} formation(s), {} séance(s), {} participant(s), {} conflit(s)",
                report.getFormationsCreated(), report.getSessionsCreated(),
                report.getParticipantsImported(), report.getConflictsDetected());
        return report;
    }

    // ==================== PERSISTANCE ====================

    private List<SeanceFormation> persistSessions(ParsedCalendarDTO parsed, ImportReportDTO report) {
        Map<String, Formation> formationsByName = new LinkedHashMap<>();
        List<SeanceFormation> persisted = new ArrayList<>();

        // Bornes de dates par formation pour renseigner dateDebut/dateFin.
        Map<String, LocalDate> minDate = new LinkedHashMap<>();
        Map<String, LocalDate> maxDate = new LinkedHashMap<>();
        for (ParsedSessionDTO s : parsed.getSessions()) {
            String key = s.getFormationName().trim();
            minDate.merge(key, s.getDate(), (a, b) -> a.isBefore(b) ? a : b);
            maxDate.merge(key, s.getDate(), (a, b) -> a.isAfter(b) ? a : b);
        }

        for (ParsedSessionDTO s : parsed.getSessions()) {
            String key = s.getFormationName().trim();
            Formation formation = formationsByName.computeIfAbsent(key,
                    name -> resolveOrCreateFormation(name, s, minDate.get(name), maxDate.get(name), report));

            // Dédoublonnage par clé métier : formation + date + numéro de séance.
            boolean duplicate = seanceRepository
                    .findByFormation_IdFormationOrderByNumeroSeanceAscDateSeanceAsc(formation.getIdFormation())
                    .stream()
                    .anyMatch(existing -> sameBusinessKey(existing, s));
            if (duplicate) {
                report.setRowsSkipped(report.getRowsSkipped() + 1);
                continue;
            }

            SeanceFormation seance = new SeanceFormation();
            seance.setFormation(formation);
            seance.setDateSeance(toDate(s.getDate()));
            seance.setHeureDebut(toTime(s.getStartTime()));
            seance.setHeureFin(toTime(s.getEndTime()));
            seance.setNumeroSeance(s.getSessionNumber());
            seance.setTotalSeances(s.getTotalSessions());
            seance.setSessionStatus(s.getStatus());
            seance.setSalle(blankToNull(s.getRoom()));
            SeanceFormation saved = seanceRepository.save(seance);
            persisted.add(saved);
            report.setSessionsCreated(report.getSessionsCreated() + 1);
        }
        return persisted;
    }

    private Formation resolveOrCreateFormation(String name, ParsedSessionDTO firstSession,
                                               LocalDate min, LocalDate max, ImportReportDTO report) {
        Optional<Formation> existing = formationRepository.findFirstByTitreFormationOrderByIdFormationAsc(name);
        if (existing.isPresent()) {
            return existing.get();
        }
        Formation formation = new Formation();
        formation.setTitreFormation(name);
        formation.setDateDebut(toDate(min));
        formation.setDateFin(toDate(max));
        formation.setEtatFormation(EtatFormation.PLANIFIE);
        formation.setTypeFormation(TypeFormation.INTERNE);
        formation.setResponsableName(blankToNull(firstSession.getTrainerName()));
        formation.setSalle(blankToNull(firstSession.getRoom()));
        formation.setCertifGenerated(false);
        formation.setCoutFormation(0f);
        formation.setChargeHoraireGlobal(0);
        Formation saved = formationRepository.save(formation);
        report.setFormationsCreated(report.getFormationsCreated() + 1);
        return saved;
    }

    private void persistParticipants(ParsedCalendarDTO parsed, ImportReportDTO report) {
        for (ParsedParticipantDTO p : parsed.getParticipants()) {
            processSingleParticipant(p, report);
        }
    }

    private void processSingleParticipant(ParsedParticipantDTO p, ImportReportDTO report) {
        Optional<Formation> formation =
                formationRepository.findFirstByTitreFormationOrderByIdFormationAsc(p.getFormationName().trim());
        if (formation.isEmpty()) {
            report.getErrors().add(esprit.pfe.serviceformation.dto.calendar.ImportRowErrorDTO.warning(
                    p.getSourceRow(), "participant",
                    "Section participant sans formation correspondante dans le planning — ignorée."));
            return;
        }
        Long formationId = formation.get().getIdFormation();
        if (participantEmailRepository.existsByFormationIdAndEmailIgnoreCase(formationId, p.getEmail())) {
            report.setRowsSkipped(report.getRowsSkipped() + 1);
            return;
        }
        boolean matched = enseignantRepository.findByMailIgnoreCase(p.getEmail()).isPresent();
        participantEmailRepository.save(FormationParticipantEmail.builder()
                .formationId(formationId)
                .email(p.getEmail())
                .matchedEnseignant(matched)
                .createdAt(LocalDateTime.now(ZoneId.systemDefault()))
                .build());
        report.setParticipantsImported(report.getParticipantsImported() + 1);
        if (!matched) {
            report.setParticipantsUnmatched(report.getParticipantsUnmatched() + 1);
        }
    }

    private ImportLog saveImportLog(MultipartFile file, String hash, long size, ImportReportDTO report) {
        long errorCount = report.getErrors().stream().filter(e -> "ERROR".equals(e.getSeverity())).count();
        String status;
        if (report.getSessionsCreated() == 0 && report.getFormationsCreated() == 0) {
            status = STATUS_FAILED;
        } else if (errorCount > 0) {
            status = "PARTIAL";
        } else {
            status = "SUCCESS";
        }
        return importLogRepository.save(ImportLog.builder()
                .fileName(file.getOriginalFilename())
                .fileSizeBytes(size)
                .fileHash(hash)
                .importedBy(currentUser())
                .importedAt(LocalDateTime.now(ZoneId.systemDefault()))
                .formationsCreated(report.getFormationsCreated())
                .sessionsCreated(report.getSessionsCreated())
                .participantsImported(report.getParticipantsImported())
                .rowsSkipped(report.getRowsSkipped())
                .conflictsDetected(report.getConflictsDetected())
                .status(status)
                .build());
    }

    /** Supprime les données liées à un import précédent (conflits + import log). */
    private void cleanupPreviousImport(Long importLogId) {
        roomConflictLogRepository.findByImportLogId(importLogId)
                .forEach(roomConflictLogRepository::delete);
        importLogRepository.deleteById(importLogId);
    }

    // ==================== VALIDATION / IO ====================

    private void validate(MultipartFile file) {
        String error = FileSecurityValidator.validate(
                file, ALLOWED_XLSX_MIME, properties.getImport().getMaxFileSizeBytes());
        if (error != null) {
            throw new ExcelImportException(error);
        }
    }

    private Workbook openWorkbook(MultipartFile file) throws IOException {
        return new XSSFWorkbook(file.getInputStream());
    }

    private Workbook openWorkbook(byte[] content) throws IOException {
        try (InputStream in = new java.io.ByteArrayInputStream(content)) {
            return new XSSFWorkbook(in);
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ExcelImportException("Lecture du fichier impossible : " + e.getMessage(), e);
        }
    }

    private String sha256(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (Exception e) {
            throw new ExcelImportException("Calcul d'empreinte impossible : " + e.getMessage(), e);
        }
    }

    // ==================== HELPERS ====================

    private boolean sameBusinessKey(SeanceFormation existing, ParsedSessionDTO parsed) {
        if (existing.getDateSeance() == null || parsed.getDate() == null) {
            return false;
        }
        LocalDate existingDate = existing.getDateSeance();
        boolean sameDate = existingDate.equals(parsed.getDate());
        boolean sameSession = java.util.Objects.equals(existing.getNumeroSeance(), parsed.getSessionNumber());
        return sameDate && sameSession;
    }

    private String resolveStatus(ImportReportDTO report) {
        boolean hasErrors = report.getErrors().stream().anyMatch(e -> "ERROR".equals(e.getSeverity()));
        if (report.getSessionsCreated() == 0 && report.getFormationsCreated() == 0) {
            return STATUS_FAILED;
        }
        return hasErrors || report.getRowsSkipped() > 0 || report.getConflictsDetected() > 0
                ? "PARTIAL" : "SUCCESS";
    }

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private static LocalDate toDate(LocalDate date) {
        return date;
    }

    private static LocalTime toTime(LocalTime time) {
        return time;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
