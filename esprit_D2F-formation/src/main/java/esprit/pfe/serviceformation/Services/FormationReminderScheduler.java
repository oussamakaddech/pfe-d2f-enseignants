package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.email.EmailTemplateBuilder;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
public class FormationReminderScheduler {
    private final SeanceFormationRepository seanceFormationRepository;

    /** Optionnel : absent si azure.ad.enabled != true */
    private final OutlookMailService outlookMailService;

    public FormationReminderScheduler(SeanceFormationRepository seanceFormationRepository,
                                      @org.springframework.lang.Nullable OutlookMailService outlookMailService) {
        this.seanceFormationRepository = seanceFormationRepository;
        this.outlookMailService = outlookMailService;
    }

    /**
     * Exécuté chaque jour à 08h00 pour vérifier les séances à venir
     * et envoyer des rappels J-7, J-3, J-1.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional(readOnly = true)
    public void sendDailyReminders() {
        // DSI §4/§2 — Outlook désactivé si azure.ad.enabled != true
        if (outlookMailService == null) {
            log.debug("[Rappel] Mail Outlook désactivé (azure.ad.enabled=false) — rappels ignorés.");
            return;
        }
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

        // Destinataires (email -> nom complet pour personnaliser l'accroche)
        Map<String, String> recipients = new LinkedHashMap<>();
        if (seance.getAnimateurs() != null) {
            seance.getAnimateurs().forEach(e -> indexRecipient(recipients, e));
        }
        if (seance.getParticipants() != null) {
            seance.getParticipants().forEach(e -> indexRecipient(recipients, e));
        }
        if (formation.getExterneFormateurEmail() != null && !formation.getExterneFormateurEmail().isBlank()) {
            recipients.putIfAbsent(formation.getExterneFormateurEmail(), null);
        }

        if (recipients.isEmpty()) return;

        String salle = seance.getSalle() != null && !seance.getSalle().isBlank() ? seance.getSalle() : "À définir";
        String subject = String.format("[D2F] Rappel J-%d : %s", daysBefore, formation.getTitreFormation());

        for (Map.Entry<String, String> entry : recipients.entrySet()) {
            try {
                String html = EmailTemplateBuilder.create()
                        .accentColor("#e65100")
                        .icon("⏰")
                        .title("Rappel — séance dans " + daysBefore + " jour" + (daysBefore > 1 ? "s" : ""))
                        .greetingName(entry.getValue())
                        .intro("Petit rappel : votre formation <strong>" + formation.getTitreFormation()
                                + "</strong> approche. Voici les informations de la prochaine séance.")
                        .detail("Date", formattedDate)
                        .detail("Horaire", formattedStart + " – " + formattedEnd)
                        .detail("Salle", salle)
                        .note("Merci de <strong>confirmer votre présence</strong> dans la plateforme D2F.")
                        .build();
                outlookMailService.sendMail(entry.getKey(), subject, html);
            } catch (Exception e) {
                log.warn("Échec envoi rappel à {} : {}", entry.getKey(), e.getMessage());
            }
        }
        log.info("Rappels J-{} envoyés pour séance {} (formation {})", daysBefore, seance.getIdSeance(), formation.getIdFormation());
    }

    /** Indexe l'e-mail d'un enseignant avec son nom complet (pour personnaliser l'accroche). */
    private void indexRecipient(Map<String, String> recipients, Enseignant e) {
        if (e == null || e.getMail() == null || e.getMail().isBlank()) {
            return;
        }
        String prenom = e.getPrenom() != null ? e.getPrenom() : "";
        String nom = e.getNom() != null ? e.getNom() : "";
        String full = (prenom + " " + nom).trim();
        recipients.putIfAbsent(e.getMail(), full.isBlank() ? null : full);
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
