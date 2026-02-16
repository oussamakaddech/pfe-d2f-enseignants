package esprit.pfe.serviceformation.Entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
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
public class SeanceFormation {

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

    // — contenu pédagogique spécifique à la séance —
    @Column(length=2000,nullable = true)

    private String contenus;          // concepts clés
    @Column(length=2000,nullable = true)
    private String methodes;
    @Column(nullable = true)
    private Float dureeTheorique;     // en heures
    @Column(nullable = true)
    private Float dureePratique;      // en heures

    @Column(length = 255, nullable = true)
    private String salle;
    @Column(name = "calendar_event_id")
    private String calendarEventId;
    // Relation vers Formation
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formation_id")

    private Formation formation;

    // Les animateurs affectés à cette séance
    @ManyToMany
    @JoinTable(
            name = "seance_animateur",
            joinColumns = @JoinColumn(name = "seance_id"),
            inverseJoinColumns = @JoinColumn(name = "enseignant_id")
    )
    private List<Enseignant> animateurs;

    // Les participants affectés à cette séance
    @ManyToMany
    @JoinTable(
            name = "seance_participant",
            joinColumns = @JoinColumn(name = "seance_id"),
            inverseJoinColumns = @JoinColumn(name = "enseignant_id")
    )
    private List<Enseignant> participants;

    // Liste de présences
    @OneToMany(mappedBy = "seanceFormation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Presence> presences;
}
