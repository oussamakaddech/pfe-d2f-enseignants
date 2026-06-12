package esprit.pfe.serviceformation.services.calendar;

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

import java.sql.Time;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalendarConflictServiceTest {

    @Mock private SeanceFormationRepository seanceRepository;
    @Mock private RoomConflictLogRepository conflictLogRepository;
    @InjectMocks private CalendarConflictService service;

    @Captor private ArgumentCaptor<List<SeanceFormation>> listCaptor;

    private SeanceFormation seance(Long id, String salle, Date date, Time debut, Time fin,
                                   Formation formation, Integer num, Integer total) {
        SeanceFormation s = new SeanceFormation();
        s.setIdSeance(id);
        s.setSalle(salle);
        s.setDateSeance(date);
        s.setHeureDebut(debut);
        s.setHeureFin(fin);
        s.setFormation(formation);
        s.setNumeroSeance(num);
        s.setTotalSeances(total);
        return s;
    }

    private Formation formation(Long id, String titre) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation(titre);
        return f;
    }

    private Date date(int year, int month, int day) {
        return Date.from(LocalDate.of(year, month, day).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant());
    }

    private Time time(int hour, int min) {
        return Time.valueOf(java.time.LocalTime.of(hour, min));
    }

    // ==================== detectAllConflicts ====================

    @Test
    void detectAllConflictsDelegatesToRepository() {
        List<SeanceFormation> seances = List.of(seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0),
                formation(1L, "Java"), 1, 1));
        when(seanceRepository.findAllByOrderByDateSeanceAscHeureDebutAsc()).thenReturn(seances);

        ConflictReportDTO report = service.detectAllConflicts();

        assertThat(report).isNotNull();
        verify(seanceRepository).findAllByOrderByDateSeanceAscHeureDebutAsc();
    }

    // ==================== detect ====================

    @Test
    void detectEmptyListReturnsNoConflicts() {
        ConflictReportDTO report = service.detect(List.of());

        assertThat(report.getTotalConflicts()).isZero();
        assertThat(report.getRoomOverlaps()).isZero();
        assertThat(report.getDuplicateFormations()).isZero();
        assertThat(report.getSessionNumberingIssues()).isZero();
        assertThat(report.getConflicts()).isEmpty();
    }

    // ==================== ROOM OVERLAPS ====================

    @Test
    void roomOverlap_differentRooms_noConflict() {
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), formation(1L, "Java"), null, null),
                seance(2L, "S2", date(2025, 3, 10), time(9, 0), time(11, 0), formation(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_differentDays_noConflict() {
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), formation(1L, "Java"), null, null),
                seance(2L, "S1", date(2025, 3, 11), time(9, 0), time(11, 0), formation(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_sameRoomSameDayOverlapping_detected() {
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(12, 0), formation(1L, "Java"), null, null),
                seance(2L, "S1", date(2025, 3, 10), time(10, 0), time(13, 0), formation(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isEqualTo(1);
        assertThat(report.getConflicts().get(0).getType()).isEqualTo(CalendarConflictService.ROOM_OVERLAP);
    }

    @Test
    void roomOverlap_adjacentTimes_noConflict() {
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), formation(1L, "Java"), null, null),
                seance(2L, "S1", date(2025, 3, 10), time(11, 0), time(13, 0), formation(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_nullSalle_skipped() {
        List<SeanceFormation> seances = List.of(
                seance(1L, null, date(2025, 3, 10), time(9, 0), time(11, 0), formation(1L, "Java"), null, null),
                seance(2L, null, date(2025, 3, 10), time(9, 0), time(11, 0), formation(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    @Test
    void roomOverlap_nullTimes_skipped() {
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), null, null, formation(1L, "Java"), null, null),
                seance(2L, "S1", date(2025, 3, 10), null, null, formation(2L, "Spring"), null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getRoomOverlaps()).isZero();
    }

    // ==================== DUPLICATE FORMATIONS ====================

    @Test
    void duplicateFormation_sameFormationSameDateTime_detected() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, null, null),
                seance(2L, "S2", date(2025, 3, 10), time(9, 0), time(11, 0), f, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isEqualTo(1);
        assertThat(report.getConflicts().get(0).getType()).isEqualTo(CalendarConflictService.DUPLICATE_FORMATION);
    }

    @Test
    void duplicateFormation_sameFormationDifferentDate_noConflict() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, null, null),
                seance(2L, "S2", date(2025, 3, 11), time(9, 0), time(11, 0), f, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    @Test
    void duplicateFormation_nullFormation_skipped() {
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), null, null, null),
                seance(2L, "S2", date(2025, 3, 10), time(9, 0), time(11, 0), null, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getDuplicateFormations()).isZero();
    }

    // ==================== SESSION NUMBERING ====================

    @Test
    void sessionNumbering_validSequence_noConflict() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, 1, 3),
                seance(2L, "S2", date(2025, 3, 11), time(9, 0), time(11, 0), f, 2, 3),
                seance(3L, "S3", date(2025, 3, 12), time(9, 0), time(11, 0), f, 3, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isZero();
    }

    @Test
    void sessionNumbering_missingSession_detected() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, 1, 3),
                seance(3L, "S3", date(2025, 3, 12), time(9, 0), time(11, 0), f, 3, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isEqualTo(1);
        assertThat(report.getConflicts().get(0).getType()).isEqualTo(CalendarConflictService.SESSION_NUMBERING);
    }

    @Test
    void sessionNumbering_duplicateNumber_detected() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, 1, 2),
                seance(2L, "S2", date(2025, 3, 11), time(9, 0), time(11, 0), f, 1, 2));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isPositive();
    }

    @Test
    void sessionNumbering_numberExceedsTotal_detected() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, 5, 3));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isPositive();
    }

    @Test
    void sessionNumbering_inconsistentTotals_detected() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, 1, 3),
                seance(2L, "S2", date(2025, 3, 11), time(9, 0), time(11, 0), f, 2, 5));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isPositive();
    }

    @Test
    void sessionNumbering_nullNumero_skipped() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(11, 0), f, null, null));

        ConflictReportDTO report = service.detect(seances);

        assertThat(report.getSessionNumberingIssues()).isZero();
    }

    // ==================== detectAndLog ====================

    @Test
    void detectAndLog_persistsConflicts() {
        Formation f = formation(1L, "Java");
        List<SeanceFormation> seances = List.of(
                seance(1L, "S1", date(2025, 3, 10), time(9, 0), time(12, 0), f, null, null),
                seance(2L, "S1", date(2025, 3, 10), time(10, 0), time(13, 0), f, null, null));

        ConflictReportDTO report = service.detectAndLog(seances, 99L);

        assertThat(report.getTotalConflicts()).isPositive();
        verify(conflictLogRepository).save(any());
    }
}
