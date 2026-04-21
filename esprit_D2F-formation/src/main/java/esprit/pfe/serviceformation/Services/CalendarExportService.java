package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.*;
import esprit.pfe.serviceformation.Repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.SimpleDateFormat;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

/**
 * Service d'export de calendrier au format .ics (iCalendar)
 */
@Service
public class CalendarExportService {

    @Autowired
    private SeanceFormationRepository seanceFormationRepository;

    @Autowired
    private FormationRepository formationRepository;

    /** Génère un fichier .ics pour toutes les séances d'une formation */
    @Transactional(readOnly = true)
    public String generateIcsForFormation(Long formationId) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable : " + formationId));

        List<SeanceFormation> seances = seanceFormationRepository.findByFormation_IdFormation(formationId);

        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\n");
        sb.append("VERSION:2.0\r\n");
        sb.append("PRODID:-//D2F//Formation//FR\r\n");
        sb.append("CALSCALE:GREGORIAN\r\n");
        sb.append("METHOD:PUBLISH\r\n");

        for (SeanceFormation seance : seances) {
            sb.append("BEGIN:VEVENT\r\n");
            sb.append("UID:d2f-formation-").append(formationId).append("-seance-").append(seance.getIdSeance()).append("@esprit.tn\r\n");

            String dtStart = formatIcsDateTime(seance.getDateSeance(), seance.getHeureDebut());
            String dtEnd = formatIcsDateTime(seance.getDateSeance(), seance.getHeureFin());

            sb.append("DTSTART;TZID=Africa/Tunis:").append(dtStart).append("\r\n");
            sb.append("DTEND;TZID=Africa/Tunis:").append(dtEnd).append("\r\n");

            sb.append("SUMMARY:[D2F] ").append(escapeIcsText(formation.getTitreFormation())).append("\r\n");

            if (seance.getSalle() != null && !seance.getSalle().isBlank()) {
                sb.append("LOCATION:").append(escapeIcsText(seance.getSalle())).append("\r\n");
            }

            StringBuilder desc = new StringBuilder();
            desc.append("Formation: ").append(formation.getTitreFormation()).append("\\n");
            if (seance.getAnimateurs() != null && !seance.getAnimateurs().isEmpty()) {
                String animStr = seance.getAnimateurs().stream()
                        .map(a -> a.getNom() + " " + a.getPrenom())
                        .reduce((a, b) -> a + ", " + b)
                        .orElse("");
                desc.append("Animateurs: ").append(animStr).append("\\n");
            }
            if (seance.getTypeSeance() != null) {
                desc.append("Type: ").append(seance.getTypeSeance()).append("\\n");
            }
            sb.append("DESCRIPTION:").append(escapeIcsText(desc.toString())).append("\r\n");

            sb.append("STATUS:CONFIRMED\r\n");
            sb.append("END:VEVENT\r\n");
        }

        sb.append("END:VCALENDAR\r\n");
        return sb.toString();
    }

    /** Génère un .ics pour les séances d'un enseignant (animateur ou participant) */
    @Transactional(readOnly = true)
    public String generateIcsForEnseignant(String enseignantId) {
        List<SeanceFormation> asAnim = seanceFormationRepository.findByAnimateurs_Id(enseignantId);
        List<SeanceFormation> asPart = seanceFormationRepository.findByParticipants_Id(enseignantId);

        // Merge and deduplicate
        java.util.Set<Long> seen = new java.util.HashSet<>();
        java.util.List<SeanceFormation> all = new java.util.ArrayList<>();
        for (SeanceFormation s : asAnim) { if (seen.add(s.getIdSeance())) all.add(s); }
        for (SeanceFormation s : asPart) { if (seen.add(s.getIdSeance())) all.add(s); }

        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\n");
        sb.append("VERSION:2.0\r\n");
        sb.append("PRODID:-//D2F//Formation//FR\r\n");
        sb.append("CALSCALE:GREGORIAN\r\n");

        for (SeanceFormation seance : all) {
            Formation formation = seance.getFormation();
            sb.append("BEGIN:VEVENT\r\n");
            sb.append("UID:d2f-ens-").append(enseignantId).append("-seance-").append(seance.getIdSeance()).append("@esprit.tn\r\n");

            String dtStart = formatIcsDateTime(seance.getDateSeance(), seance.getHeureDebut());
            String dtEnd = formatIcsDateTime(seance.getDateSeance(), seance.getHeureFin());

            sb.append("DTSTART;TZID=Africa/Tunis:").append(dtStart).append("\r\n");
            sb.append("DTEND;TZID=Africa/Tunis:").append(dtEnd).append("\r\n");
            sb.append("SUMMARY:[D2F] ").append(escapeIcsText(formation != null ? formation.getTitreFormation() : "Formation")).append("\r\n");

            if (seance.getSalle() != null && !seance.getSalle().isBlank()) {
                sb.append("LOCATION:").append(escapeIcsText(seance.getSalle())).append("\r\n");
            }
            sb.append("END:VEVENT\r\n");
        }

        sb.append("END:VCALENDAR\r\n");
        return sb.toString();
    }

    private String formatIcsDateTime(Date date, java.sql.Time time) {
        SimpleDateFormat dateFmt = new SimpleDateFormat("yyyyMMdd");
        SimpleDateFormat timeFmt = new SimpleDateFormat("HHmmss");
        return dateFmt.format(date) + "T" + timeFmt.format(time);
    }

    private String escapeIcsText(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\").replace("\"", "\\\"").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n");
    }
}