package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.time.format.DateTimeFormatter;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service de rappel automatique pour les formations planifiées.
 * Envoie des notifications J-7, J-3 et J-1 avant chaque séance.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FormationReminderScheduler {
    private final SeanceFormationRepository seanceFormationRepository;
    private final OutlookMailService outlookMailService;

    /**
     * Exécuté chaque jour à 08h00 pour vérifier les séances à venir
     * et envoyer des rappels J-7, J-3, J-1.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional(readOnly = true)
    public void sendDailyReminders() {
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Tunis"));
        int[] daysBefore = {7, 3, 1};

        for (int days : daysBefore) {
            LocalDate targetDate = today.plusDays(days);
            List<SeanceFormation> seances = seanceFormationRepository.findByDateSeance(
                    java.sql.Date.valueOf(targetDate)
            );

            for (SeanceFormation seance : seances) {
                Formation formation = seance.getFormation();
                if (formation == null || formation.getEtatFormation() != EtatFormation.PLANIFIE) {
                    continue;
                }
                try {
                    sendReminderForSeance(formation, seance, days);
                } catch (Exception e) {
                    log.error("Erreur rappel J-{} pour séance {} : {}", days, seance.getIdSeance(), e.getMessage());
                }
            }
        }
    }

    private void sendReminderForSeance(Formation formation, SeanceFormation seance, int daysBefore) {
        DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter timeFormat = DateTimeFormatter.ofPattern("HH:mm");
        
        LocalDate lDate = ((java.sql.Date)seance.getDateSeance()).toLocalDate();
        String formattedDate = lDate.format(dateFormat);
        String formattedStart = seance.getHeureDebut().toLocalTime().format(timeFormat);
        String formattedEnd = seance.getHeureFin().toLocalTime().format(timeFormat);

        Set<String> emails = new HashSet<>();
        if (seance.getAnimateurs() != null) {
            seance.getAnimateurs().stream()
                    .map(Enseignant::getMail)
                    .filter(m -> m != null && !m.isBlank())
                    .forEach(emails::add);
        }
        if (seance.getParticipants() != null) {
            seance.getParticipants().stream()
                    .map(Enseignant::getMail)
                    .filter(m -> m != null && !m.isBlank())
                    .forEach(emails::add);
        }
        if (formation.getExterneFormateurEmail() != null && !formation.getExterneFormateurEmail().isBlank()) {
            emails.add(formation.getExterneFormateurEmail());
        }

        if (emails.isEmpty()) return;

        String subject = String.format("[D2F] Rappel J-%d : %s", daysBefore, formation.getTitreFormation());

        String html = "<!DOCTYPE html><html><head><style>" +
                "body { font-family: 'Segoe UI', sans-serif; color: #333; }" +
                ".container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9; }" +
                ".header { background-color: #c62828; color: white; padding: 10px; text-align: center; border-radius: 10px 10px 0 0; }" +
                ".content { padding: 20px; }" +
                ".footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }" +
                "strong { color: #c62828; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'><h2>Rappel de Formation - J-" + daysBefore + "</h2></div>" +
                "<div class='content'>" +
                "<p>Bonjour,</p>" +
                "<p>Ceci est un rappel : la formation <strong>\"" + formation.getTitreFormation() + "\"</strong> aura lieu le <strong>" +
                formattedDate + "</strong> de <strong>" +
                formattedStart + "</strong> à <strong>" +
                formattedEnd + "</strong>" +
                (seance.getSalle() != null ? " en salle <strong>" + seance.getSalle() + "</strong>" : "") +
                ".</p>" +
                "<p>Merci de confirmer votre présence.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Ceci est un e-mail automatique, merci de ne pas y répondre.</p>" +
                "<p>&copy; Esprit - Direction du Développement et de la Formation</p>" +
                "</div></div></body></html>";

        for (String email : emails) {
            try {
                outlookMailService.sendMail(email, subject, html);
            } catch (Exception e) {
                log.warn("Échec envoi rappel à {} : {}", email, e.getMessage());
            }
        }
        log.info("Rappels J-{} envoyés pour séance {} (formation {})", daysBefore, seance.getIdSeance(), formation.getIdFormation());
    }

    /** Permet de déclencher manuellement les rappels pour une formation donnée */
    @Transactional(readOnly = true)
    public void sendRemindersForFormation(Long formationId, int daysBefore) {
        List<SeanceFormation> seances = seanceFormationRepository.findByFormation_IdFormation(formationId);
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Tunis"));
        LocalDate targetDate = today.plusDays(daysBefore);

        List<SeanceFormation> matching = seances.stream()
                .filter(s -> {
                    LocalDate seanceDate = ((java.sql.Date) s.getDateSeance()).toLocalDate();
                    return seanceDate.equals(targetDate);
                })
                .toList();

        for (SeanceFormation seance : matching) {
            Formation formation = seance.getFormation();
            if (formation != null && formation.getEtatFormation() == EtatFormation.PLANIFIE) {
                sendReminderForSeance(formation, seance, daysBefore);
            }
        }
    }
}
