package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.esprit.d2f.entity.enumerations.NotificationSeverity;
import tn.esprit.d2f.entity.enumerations.NotificationType;

/**
 * Entité Notification — pivot du centre de notifications in-app.
 *
 * <p>Destinataire identifié par son {@code recipient} (username / email issu du
 * JWT), ce qui permet de router aussi bien les notifications perso (issues des
 * événements métier RabbitMQ) que les notifications système broadcast.</p>
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notification extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("idNotification")
    private Long idNotification;

    /** Destinataire (username / email du JWT). */
    @Column(nullable = false, length = 150)
    private String recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private NotificationSeverity severity;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /** Lu / non lu — base du compteur de badges côté front. */
    @Column(nullable = false)
    private boolean read = false;

    /** Route interne optionnelle déclenchée au clic. */
    @Column(length = 255)
    private String link;

    /** Acteur ayant déclenché la notification (ex. « Chef Département »). */
    @Column(length = 150)
    private String actor;
}
