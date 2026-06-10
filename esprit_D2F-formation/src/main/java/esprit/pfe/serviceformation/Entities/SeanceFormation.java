package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Time;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "seances")
public class SeanceFormation extends BaseAuditEntity {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long idSeance;

        @Temporal(TemporalType.DATE)
        private Date dateSeance;

        private Time heureDebut;
        private Time heureFin;

        @Enumerated(EnumType.STRING)
        @Column(nullable = true)
        private TypeSeanceEnum typeSeance;

        // — numérotation de séance « Séance X/Y » (importée du calendrier des ateliers) —
        @Column(name = "session_number", nullable = true)
        private Integer numeroSeance; // X

        @Column(name = "total_sessions", nullable = true)
        private Integer totalSeances; // Y

        // Statut de diffusion de la séance : TEAMS, OPEN (ouverte) ou CLOSED (fermée)
        @Column(name = "session_status", length = 30, nullable = true)
        private String sessionStatus;

        // — contenu pédagogique spécifique à la séance —
        @Column(length = 2000, nullable = true)

        private String contenus; // concepts clés
        @Column(length = 2000, nullable = true)
        private String methodes;
        @Column(nullable = true)
        private Float dureeTheorique; // en heures
        @Column(nullable = true)
        private Float dureePratique; // en heures

        @Column(length = 255, nullable = true)
        private String salle;
        @Column(name = "calendar_event_id")
        private String calendarEventId;
        @Column(name = "online_meeting_url", length = 500, nullable = true)
        private String onlineMeetingUrl; // URL de réunion Teams générée automatiquement
        // Relation vers Formation
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "formation_id")

        private Formation formation;

        // Les animateurs affectés à cette séance
        @ManyToMany
        @JoinTable(name = "seance_animateur", joinColumns = @JoinColumn(name = "seance_id"), inverseJoinColumns = @JoinColumn(name = "enseignant_id"))
        private List<Enseignant> animateurs;

        // Les participants affectés à cette séance
        @ManyToMany
        @JoinTable(name = "seance_participant", joinColumns = @JoinColumn(name = "seance_id"), inverseJoinColumns = @JoinColumn(name = "enseignant_id"))
        private List<Enseignant> participants;

        // Liste de présences
        @OneToMany(mappedBy = "seanceFormation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
        private List<Presence> presences;
}
