package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.dto.calendar.ConflictDTO;
import esprit.pfe.serviceformation.dto.calendar.ConflictReportDTO;
import esprit.pfe.serviceformation.entities.RoomConflictLog;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.repositories.RoomConflictLogRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Détection des conflits du calendrier :
 * <ul>
 *   <li>conflits de salle (deux séances dans la même salle à des horaires qui se chevauchent) ;</li>
 *   <li>doublons de formation (même intitulé, même date, même créneau) ;</li>
 *   <li>numérotation de séance incohérente (« Séance X/Y »).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class CalendarConflictService {

    public static final String ROOM_OVERLAP = "ROOM_OVERLAP";
    public static final String DUPLICATE_FORMATION = "DUPLICATE_FORMATION";
    public static final String SESSION_NUMBERING = "SESSION_NUMBERING";

    private final SeanceFormationRepository seanceRepository;
    private final RoomConflictLogRepository conflictLogRepository;

    /** Analyse l'ensemble du calendrier persisté. */
    @Transactional(readOnly = true)
    public ConflictReportDTO detectAllConflicts() {
        return detect(seanceRepository.findAllByOrderByDateSeanceAscHeureDebutAsc());
    }

    /** Analyse une liste de séances (utilisé aussi lors de l'import). */
    public ConflictReportDTO detect(List<SeanceFormation> seances) {
        List<ConflictDTO> conflicts = new ArrayList<>();
        detectRoomOverlaps(seances, conflicts);
        detectDuplicateFormations(seances, conflicts);
        detectSessionNumbering(seances, conflicts);

        int room = (int) conflicts.stream().filter(c -> ROOM_OVERLAP.equals(c.getType())).count();
        int dup = (int) conflicts.stream().filter(c -> DUPLICATE_FORMATION.equals(c.getType())).count();
        int sess = (int) conflicts.stream().filter(c -> SESSION_NUMBERING.equals(c.getType())).count();

        return ConflictReportDTO.builder()
                .totalConflicts(conflicts.size())
                .roomOverlaps(room)
                .duplicateFormations(dup)
                .sessionNumberingIssues(sess)
                .conflicts(conflicts)
                .build();
    }

    /** Détecte et persiste les conflits dans {@code room_conflict_log}. */
    @Transactional
    public ConflictReportDTO detectAndLog(List<SeanceFormation> seances, Long importLogId) {
        ConflictReportDTO report = detect(seances);
        for (ConflictDTO c : report.getConflicts()) {
            conflictLogRepository.save(RoomConflictLog.builder()
                    .conflictType(c.getType())
                    .salle(c.getSalle())
                    .dateSeance(parseDate(c.getDateSeance()))
                    .heureDebut(c.getHeureDebut())
                    .heureFin(c.getHeureFin())
                    .seanceId(c.getSeanceId())
                    .otherSeanceId(c.getOtherSeanceId())
                    .detail(c.getDetail())
                    .detectedAt(LocalDateTime.now())
                    .importLogId(importLogId)
                    .build());
        }
        return report;
    }

    // ==================== SALLE ====================

    private void detectRoomOverlaps(List<SeanceFormation> seances, List<ConflictDTO> out) {
        Map<String, List<SeanceFormation>> byRoomDay = new LinkedHashMap<>();
        for (SeanceFormation s : seances) {
            if (s.getSalle() == null || s.getSalle().isBlank()
                    || s.getDateSeance() == null || s.getHeureDebut() == null || s.getHeureFin() == null) {
                continue;
            }
            String key = normalize(s.getSalle()) + "|" + dateKey(s.getDateSeance());
            byRoomDay.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        for (List<SeanceFormation> group : byRoomDay.values()) {
            for (int i = 0; i < group.size(); i++) {
                for (int j = i + 1; j < group.size(); j++) {
                    SeanceFormation a = group.get(i);
                    SeanceFormation b = group.get(j);
                    if (overlaps(a.getHeureDebut(), a.getHeureFin(), b.getHeureDebut(), b.getHeureFin())) {
                        out.add(ConflictDTO.builder()
                                .type(ROOM_OVERLAP)
                                .salle(a.getSalle())
                                .dateSeance(dateKey(a.getDateSeance()))
                                .heureDebut(String.valueOf(a.getHeureDebut()))
                                .heureFin(String.valueOf(a.getHeureFin()))
                                .seanceId(a.getIdSeance())
                                .otherSeanceId(b.getIdSeance())
                                .detail("Salle « " + a.getSalle() + " » réservée simultanément le "
                                        + dateKey(a.getDateSeance()) + " (séances " + a.getIdSeance()
                                        + " et " + b.getIdSeance() + ").")
                                .build());
                    }
                }
            }
        }
    }

    // ==================== DOUBLONS DE FORMATION ====================

    private void detectDuplicateFormations(List<SeanceFormation> seances, List<ConflictDTO> out) {
        Map<String, List<SeanceFormation>> byKey = new LinkedHashMap<>();
        for (SeanceFormation s : seances) {
            if (s.getFormation() == null || s.getFormation().getTitreFormation() == null
                    || s.getDateSeance() == null || s.getHeureDebut() == null) {
                continue;
            }
            String key = normalize(s.getFormation().getTitreFormation()) + "|" + dateKey(s.getDateSeance())
                    + "|" + s.getHeureDebut() + "|" + s.getHeureFin();
            byKey.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        for (List<SeanceFormation> group : byKey.values()) {
            Set<Long> distinctFormations = new TreeSet<>();
            group.forEach(s -> distinctFormations.add(s.getFormation().getIdFormation()));
            if (distinctFormations.size() > 1 || group.size() > 1) {
                SeanceFormation a = group.get(0);
                out.add(ConflictDTO.builder()
                        .type(DUPLICATE_FORMATION)
                        .dateSeance(dateKey(a.getDateSeance()))
                        .heureDebut(String.valueOf(a.getHeureDebut()))
                        .heureFin(String.valueOf(a.getHeureFin()))
                        .seanceId(a.getIdSeance())
                        .detail("Formation « " + a.getFormation().getTitreFormation()
                                + " » planifiée en double le " + dateKey(a.getDateSeance())
                                + " sur le même créneau (" + group.size() + " occurrences).")
                        .build());
            }
        }
    }

    // ==================== NUMÉROTATION DE SÉANCE ====================

    private void detectSessionNumbering(List<SeanceFormation> seances, List<ConflictDTO> out) {
        Map<Long, List<SeanceFormation>> byFormation = new LinkedHashMap<>();
        for (SeanceFormation s : seances) {
            if (s.getFormation() == null || s.getNumeroSeance() == null) {
                continue;
            }
            byFormation.computeIfAbsent(s.getFormation().getIdFormation(), k -> new ArrayList<>()).add(s);
        }
        for (Map.Entry<Long, List<SeanceFormation>> entry : byFormation.entrySet()) {
            List<SeanceFormation> group = entry.getValue();
            Set<Integer> totals = new TreeSet<>();
            Set<Integer> numbers = new TreeSet<>();
            String titre = group.get(0).getFormation().getTitreFormation();
            boolean duplicateNumber = false;
            for (SeanceFormation s : group) {
                if (s.getTotalSeances() != null) {
                    totals.add(s.getTotalSeances());
                }
                if (!numbers.add(s.getNumeroSeance())) {
                    duplicateNumber = true;
                }
                if (s.getTotalSeances() != null && s.getNumeroSeance() > s.getTotalSeances()) {
                    out.add(numberingConflict(entry.getKey(), titre,
                            "Numéro de séance " + s.getNumeroSeance() + " supérieur au total "
                                    + s.getTotalSeances() + "."));
                }
            }
            if (totals.size() > 1) {
                out.add(numberingConflict(entry.getKey(), titre,
                        "Total de séances incohérent (" + totals + ") au sein de la même formation."));
            }
            if (duplicateNumber) {
                out.add(numberingConflict(entry.getKey(), titre, "Numéro de séance dupliqué."));
            }
            if (!totals.isEmpty()) {
                int expectedTotal = totals.iterator().next();
                for (int n = 1; n <= expectedTotal; n++) {
                    if (!numbers.contains(n)) {
                        out.add(numberingConflict(entry.getKey(), titre,
                                "Séance " + n + "/" + expectedTotal + " manquante."));
                    }
                }
            }
        }
    }

    private ConflictDTO numberingConflict(Long formationId, String titre, String detail) {
        return ConflictDTO.builder()
                .type(SESSION_NUMBERING)
                .seanceId(formationId)
                .detail("Formation « " + titre + " » : " + detail)
                .build();
    }

    // ==================== HELPERS ====================

    private static boolean overlaps(Time aStart, Time aEnd, Time bStart, Time bEnd) {
        return aStart.before(bEnd) && bStart.before(aEnd);
    }

    private static String normalize(String s) {
        return s == null ? "" : s.trim().toUpperCase().replace(" ", "");
    }

    private static String dateKey(Date date) {
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString();
    }

    private static LocalDate parseDate(String iso) {
        try {
            return iso == null ? null : LocalDate.parse(iso);
        } catch (Exception e) {
            return null;
        }
    }
}
