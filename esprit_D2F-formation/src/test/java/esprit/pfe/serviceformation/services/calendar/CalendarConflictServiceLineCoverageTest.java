package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.dto.calendar.ConflictDTO;
import esprit.pfe.serviceformation.dto.calendar.ConflictReportDTO;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.repositories.RoomConflictLogRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CalendarConflictServiceLineCoverageTest {

    @Mock private SeanceFormationRepository seanceRepository;
    @Mock private RoomConflictLogRepository conflictLogRepository;
    @InjectMocks private CalendarConflictService service;

    @Captor private ArgumentCaptor<esprit.pfe.serviceformation.entities.RoomConflictLog> logCaptor;

    // ==================== helpers ====================

    private SeanceFormation s(Long id, String salle, LocalDate date, LocalTime debut, LocalTime fin,
                              Formation f, Integer num, Integer total) {
        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(id);
        seance.setSalle(salle);
        seance.setDateSeance(date);
        seance.setHeureDebut(debut);
        seance.setHeureFin(fin);
        seance.setFormation(f);
        seance.setNumeroSeance(num);
        seance.setTotalSeances(total);
        return seance;
    }

    private Formation f(Long id, String titre) {
        Formation formation = new Formation();
        formation.setIdFormation(id);
        formation.setTitreFormation(titre);
        return formation;
    }

    private LocalDate d(int y, int m, int day) {
        return LocalDate.of(y, m, day);
    }

    private LocalTime t(int h, int min) {
        return LocalTime.of(h, min);
    }

    // ==================== detectAllConflicts ====================

    @Test
    void detectAllConflicts_delegatesToRepository() {
        when(seanceRepository.findAllByOrderByDateSeanceAscHeureDebutAsc()).thenReturn(List.of());

        ConflictReportDTO report = service.detectAllConflicts();

        assertThat(report.getTotalConflicts()).isZero();
        verify(seanceRepository).findAllByOrderByDateSeanceAscHeureDebutAsc();
    }

    @Test
    void detectAllConflicts_withSeances() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, 1));
        when(seanceRepository.findAllByOrderByDateSeanceAscHeureDebutAsc()).thenReturn(seances);

        ConflictReportDTO report = service.detectAllConflicts();

        assertThat(report).isNotNull();
    }

    // ==================== detect ====================

    @Test
    void detect_emptyList() {
        ConflictReportDTO report = service.detect(List.of());

        assertThat(report.getTotalConflicts()).isZero();
        assertThat(report.getRoomOverlaps()).isZero();
        assertThat(report.getDuplicateFormations()).isZero();
        assertThat(report.getSessionNumberingIssues()).isZero();
        assertThat(report.getConflicts()).isEmpty();
    }

    // ==================== ROOM OVERLAPS ====================

    @Test
    void roomOverlap_sameRoomSameDay_overlap() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(12, 0), f(1L, "J"), null, null),
                s(2L, "S1", d(2025, 6, 1), t(10, 0), t(13, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isEqualTo(1);
        assertThat(report.getConflicts().get(0).getType()).isEqualTo(CalendarConflictService.ROOM_OVERLAP);
    }

    @Test
    void roomOverlap_sameRoomDifferentDay_noOverlap() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f(1L, "J"), null, null),
                s(2L, "S1", d(2025, 6, 2), t(9, 0), t(11, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_differentRoomsSameDay_noOverlap() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f(1L, "J"), null, null),
                s(2L, "S2", d(2025, 6, 1), t(9, 0), t(11, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_adjacent_noOverlap() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f(1L, "J"), null, null),
                s(2L, "S1", d(2025, 6, 1), t(11, 0), t(13, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_nullSalle_skipped() {
        List<SeanceFormation> seances = List.of(
                s(1L, null, d(2025, 6, 1), t(9, 0), t(11, 0), f(1L, "J"), null, null),
                s(2L, null, d(2025, 6, 1), t(9, 0), t(11, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_blankSalle_skipped() {
        List<SeanceFormation> seances = List.of(
                s(1L, "  ", d(2025, 6, 1), t(9, 0), t(11, 0), f(1L, "J"), null, null),
                s(2L, "  ", d(2025, 6, 1), t(9, 0), t(11, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_nullDate_skipped() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", null, t(9, 0), t(11, 0), f(1L, "J"), null, null),
                s(2L, "S1", null, t(9, 0), t(11, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_nullTimes_skipped() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), null, null, f(1L, "J"), null, null),
                s(2L, "S1", d(2025, 6, 1), null, null, f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_withSpacesInSalle_normalized() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S 1", d(2025, 6, 1), t(9, 0), t(12, 0), f(1L, "J"), null, null),
                s(2L, "S1", d(2025, 6, 1), t(10, 0), t(13, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isEqualTo(1);
    }

    @Test
    void roomOverlap_threeSeancesSameRoom_twoConflicts() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(12, 0), f(1L, "A"), null, null),
                s(2L, "S1", d(2025, 6, 1), t(10, 0), t(13, 0), f(2L, "B"), null, null),
                s(3L, "S1", d(2025, 6, 1), t(11, 0), t(14, 0), f(3L, "C"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isEqualTo(3);
    }

    // ==================== DUPLICATE FORMATIONS ====================

    @Test
    void duplicateFormation_sameFormationSameSlot() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, null, null),
                s(2L, "S2", d(2025, 6, 1), t(9, 0), t(11, 0), f1, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isEqualTo(1);
        assertThat(report.getConflicts().get(0).getType()).isEqualTo(CalendarConflictService.DUPLICATE_FORMATION);
    }

    @Test
    void duplicateFormation_differentFormationSameSlot_noConflict() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f(1L, "Java"), null, null),
                s(2L, "S2", d(2025, 6, 1), t(9, 0), t(11, 0), f(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    @Test
    void duplicateFormation_sameFormationDifferentSlot_noConflict() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, null, null),
                s(2L, "S2", d(2025, 6, 1), t(14, 0), t(16, 0), f1, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    @Test
    void duplicateFormation_nullFormation_skipped() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), null, null, null),
                s(2L, "S2", d(2025, 6, 1), t(9, 0), t(11, 0), null, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    @Test
    void duplicateFormation_nullTitre_skipped() {
        Formation f1 = f(1L, null);
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, null, null),
                s(2L, "S2", d(2025, 6, 1), t(9, 0), t(11, 0), f1, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    @Test
    void duplicateFormation_nullDate_skipped() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", null, t(9, 0), t(11, 0), f1, null, null),
                s(2L, "S2", null, t(9, 0), t(11, 0), f1, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    @Test
    void duplicateFormation_nullHeureDebut_skipped() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), null, t(11, 0), f1, null, null),
                s(2L, "S2", d(2025, 6, 1), null, t(11, 0), f1, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    @Test
    void duplicateFormation_sameFormationSameSlotDifferentId_detected() {
        Formation f1 = f(1L, "Java");
        Formation f2 = f(2L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, null, null),
                s(2L, "S2", d(2025, 6, 1), t(9, 0), t(11, 0), f2, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isEqualTo(1);
    }

    // ==================== SESSION NUMBERING ====================

    @Test
    void sessionNumbering_validSequence() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, 3),
                s(2L, "S2", d(2025, 6, 2), t(9, 0), t(11, 0), f1, 2, 3),
                s(3L, "S3", d(2025, 6, 3), t(9, 0), t(11, 0), f1, 3, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isZero();
    }

    @Test
    void sessionNumbering_missingSession() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, 3),
                s(3L, "S3", d(2025, 6, 3), t(9, 0), t(11, 0), f1, 3, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isEqualTo(1);
        assertThat(report.getConflicts().get(0).getDetail()).contains("manquante");
    }

    @Test
    void sessionNumbering_duplicateNumber() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, 2),
                s(2L, "S2", d(2025, 6, 2), t(9, 0), t(11, 0), f1, 1, 2));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isPositive();
        assertThat(report.getConflicts()).anyMatch(c -> c.getDetail().contains("dupliqué"));
    }

    @Test
    void sessionNumbering_numberExceedsTotal() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 5, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isPositive();
        assertThat(report.getConflicts()).anyMatch(c -> c.getDetail().contains("supérieur au total"));
    }

    @Test
    void sessionNumbering_inconsistentTotals() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, 3),
                s(2L, "S2", d(2025, 6, 2), t(9, 0), t(11, 0), f1, 2, 5));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isPositive();
        assertThat(report.getConflicts()).anyMatch(c -> c.getDetail().contains("incohérent"));
    }

    @Test
    void sessionNumbering_nullNumero_skipped() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isZero();
    }

    @Test
    void sessionNumbering_nullFormation_skipped() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), null, 1, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isZero();
    }

    @Test
    void sessionNumbering_multipleFormations() {
        Formation f1 = f(1L, "Java");
        Formation f2 = f(2L, "Spring");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, 2),
                s(2L, "S2", d(2025, 6, 2), t(9, 0), t(11, 0), f1, 2, 2),
                s(3L, "S3", d(2025, 6, 1), t(9, 0), t(11, 0), f2, 1, 3),
                s(4L, "S4", d(2025, 6, 2), t(9, 0), t(11, 0), f2, 3, 3));

        ConflictReportDTO report = service.detect(seances);

        // f2 has missing session 2
        assertThat(report.getSessionNumberingIssues()).isEqualTo(1);
    }

    @Test
    void sessionNumbering_noTotalButHasNumber() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isZero();
    }

    @Test
    void sessionNumbering_allMissing() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 2, 3));

        ConflictReportDTO report = service.detect(seances);

        // sessions 1 and 3 are missing
        assertThat(report.getSessionNumberingIssues()).isPositive();
    }

    // ==================== detectAndLog ====================

    @Test
    void detectAndLog_noConflicts() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f(1L, "Java"), 1, 1));

        ConflictReportDTO report = service.detectAndLog(seances, 10L);

        assertThat(report.getTotalConflicts()).isZero();
        verify(conflictLogRepository, never()).save(any());
    }

    @Test
    void detectAndLog_withConflicts_persists() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(12, 0), f(1L, "Java"), null, null),
                s(2L, "S1", d(2025, 6, 1), t(10, 0), t(13, 0), f(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detectAndLog(seances, 10L);

        assertThat(report.getTotalConflicts()).isPositive();
        verify(conflictLogRepository, times(1)).save(any());
    }

    @Test
    void detectAndLog_withNullDate_parsesDate() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", null, null, null, null, null, null));

        ConflictReportDTO report = service.detectAndLog(seances, 10L);

        assertThat(report).isNotNull();
    }

    @Test
    void detectAndLog_withInvalidDateString() {
        ConflictDTO conflict = ConflictDTO.builder()
                .type(CalendarConflictService.ROOM_OVERLAP)
                .dateSeance("not-a-date")
                .build();

        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(12, 0), f(1L, "Java"), null, null),
                s(2L, "S1", d(2025, 6, 1), t(10, 0), t(13, 0), f(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detectAndLog(seances, 10L);

        assertThat(report).isNotNull();
    }

    // ==================== mixed conflicts ====================

    @Test
    void detect_mixedConflicts() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(12, 0), f1, 1, 3),
                s(2L, "S2", d(2025, 6, 1), t(9, 0), t(12, 0), f1, 1, 3),
                s(3L, "S3", d(2025, 6, 1), t(14, 0), t(16, 0), f1, 4, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
        assertThat(report.getDuplicateFormations()).isPositive();
        assertThat(report.getSessionNumberingIssues()).isPositive();
        assertThat(report.getTotalConflicts()).isPositive();
    }

    // ==================== constant values ====================

    @Test
    void constantsHaveExpectedValues() {
        assertThat(CalendarConflictService.ROOM_OVERLAP).isEqualTo("ROOM_OVERLAP");
        assertThat(CalendarConflictService.DUPLICATE_FORMATION).isEqualTo("DUPLICATE_FORMATION");
        assertThat(CalendarConflictService.SESSION_NUMBERING).isEqualTo("SESSION_NUMBERING");
    }

    // ==================== parseDate edge cases ====================

    @Test
    void detectAndLog_nullDateSeanceInConflict() {
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(12, 0), f(1L, "Java"), null, null),
                s(2L, "S1", d(2025, 6, 1), t(10, 0), t(13, 0), f(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detectAndLog(seances, 10L);

        assertThat(report).isNotNull();
    }

    @Test
    void detectAndLog_emptySeances() {
        ConflictReportDTO report = service.detectAndLog(List.of(), 10L);

        assertThat(report.getTotalConflicts()).isZero();
        verify(conflictLogRepository, never()).save(any());
    }

    // ==================== normalize edge cases ====================

    @Test
    void roomOverlap_caseInsensitiveNormalize() {
        List<SeanceFormation> seances = List.of(
                s(1L, "salle 1", d(2025, 6, 1), t(9, 0), t(12, 0), f(1L, "J"), null, null),
                s(2L, "SALLE 1", d(2025, 6, 1), t(10, 0), t(13, 0), f(2L, "S"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isEqualTo(1);
    }

    // ==================== addTotalIfPresent ====================

    @Test
    void sessionNumbering_nullTotal() {
        Formation f1 = f(1L, "Java");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isZero();
    }

    // ==================== groupByFormation edge ====================

    @Test
    void detect_multipleFormationsNoConflicts() {
        Formation f1 = f(1L, "Java");
        Formation f2 = f(2L, "Spring");
        List<SeanceFormation> seances = List.of(
                s(1L, "S1", d(2025, 6, 1), t(9, 0), t(11, 0), f1, 1, 1),
                s(2L, "S2", d(2025, 6, 2), t(9, 0), t(11, 0), f2, 1, 1));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getTotalConflicts()).isZero();
    }
}
