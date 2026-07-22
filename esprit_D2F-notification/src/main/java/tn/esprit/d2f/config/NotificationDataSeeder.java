package tn.esprit.d2f.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.dto.NotificationRequest;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.INotificationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Amorçage de données RÉELLES : si la table est vide, crée un jeu de
 * notifications représentatives pour les destinataires de démonstration
 * (comptes existants, ex. admin). Ces notifications proviennent de cas d'usage
 * réels du parcours D2F (formation planifiée, certificat disponible, besoin
 * validé, évaluation à compléter…) et ne sont pas de simples « lorem ipsum ».
 *
 * <p>Désactivable via {@code app.notification.seed=false} (ex. en production
 * après un premier run). Les autres notifications « live » arrivent ensuite via
 * RabbitMQ / l'endpoint admin.</p>
 */
@Slf4j
@Component
@Order(10)
@RequiredArgsConstructor
public class NotificationDataSeeder implements CommandLineRunner {

    private static final String ACTOR_SYSTEM = "Système";
    private static final String ACTOR_DEPARTMENT = "Chef Département";
    private static final String ACTOR_CUP = "CUP";

    private final NotificationRepository repository;
    private final INotificationService notificationService;

    @Value("${app.notification.seed.recipients:admin}")
    private List<String> seedRecipients;

    @Value("${app.notification.seed:true}")
    private boolean seedEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }
        if (repository.count() > 0) {
            log.info("[seed] notifications déjà présentes — amorçage ignoré");
            return;
        }

        String demo = seedRecipients.get(0);

        List<NotificationRequest> seed = List.of(
                new NotificationRequest(demo, NotificationType.FORMATION, NotificationSeverity.INFO,
                        "Nouvelle formation planifiée",
                        "« Intelligence Artificielle appliquée » – 12 oct. 2026, Bloc C.",
                        "/home/Formation/Consulter", ACTOR_CUP, Map.of("formationId", 42)),
                new NotificationRequest(demo, NotificationType.CERTIFICAT, NotificationSeverity.SUCCESS,
                        "Certificat disponible",
                        "Votre certificat « Cloud & DevOps » est prêt au téléchargement.",
                        "/home/certificate/MyCertificate", ACTOR_SYSTEM, Map.of("certificatId", 17)),
                new NotificationRequest(demo, NotificationType.BESOIN, NotificationSeverity.INFO,
                        "Besoin validé",
                        "Votre besoin en formation « Python avancé » a été validé par votre chef de département.",
                        "/home/besoins", ACTOR_DEPARTMENT, Map.of("besoinId", 8)),
                new NotificationRequest(demo, NotificationType.EVALUATION, NotificationSeverity.WARNING,
                        "Évaluation à compléter",
                        "Votre évaluation de la formation « Cybersécurité » expire dans 48 h.",
                        "/home/Evaluations", ACTOR_SYSTEM, Map.of("evaluationId", 23)),
                new NotificationRequest(demo, NotificationType.COMPETENCE, NotificationSeverity.SUCCESS,
                        "Compétence acquise",
                        "La compétence « Gestion de projet agile » a été ajoutée à votre Skill Passport.",
                        "/home/skill-passport", ACTOR_SYSTEM, Map.of("competenceId", 5))
        );

        for (NotificationRequest req : seed) {
            notificationService.create(req);
        }
        log.info("[seed] {} notifications réelles créées pour {}", seed.size(), demo);
    }
}
