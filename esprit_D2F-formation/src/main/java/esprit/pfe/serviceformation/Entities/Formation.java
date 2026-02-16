package esprit.pfe.serviceformation.Entities;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity

@Table(name = "formations")
public class Formation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)

    private Long idFormation;
    @Column(nullable = true)
    private Long idBesoinFormation;
    @Column(nullable = true)
    private String typeBesoin;
    @Column(nullable = false, length = 255)
    private String titreFormation;
    @Column(nullable = true)
    private String domaine;
    @Column(nullable = true)
    private String competance ;
    @Column(nullable = true)
    private String populationCible;

    // — objectifs & évaluation —
    @Column(length = 2000,nullable = true)
    private String objectifs;           // objectifs de formation
    @Column(length = 2000,nullable = true)
    private String objectifsPedago;     // objectifs pédagogiques
    @Column(length = 2000,nullable = true)
    private String evalMethods;


    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private TypeFormation typeFormation; // Enum: INTERNE, EXTERNE, etc.
    @Column(length = 100, nullable = true)
    private String externeFormateurNom;

    @Column(length = 100, nullable = true)
    private String externeFormateurPrenom;

    @Column(length = 255, nullable = true)
    private String externeFormateurEmail;

    @Column(length = 255 ,nullable = true)
    private String organismeRefExterne;




    @Temporal(TemporalType.DATE)
    @Column(nullable = false)
    private Date dateDebut;

    @Temporal(TemporalType.DATE)
    @Column(nullable = false)
    private Date dateFin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EtatFormation etatFormation; // Enum: PLANIFIEE, EN_COURS, ANNULEE, ACHEVEE

    // — budget détaillé —
    @Column(nullable = true)
    private Float coutTransport;
    @Column(nullable = true)
    private Float coutHebergement;
    @Column(nullable = true)
    private Float coutRepas;
    @Column(nullable = true)
    private float coutFormation;


    // — pré-requis / acquis / indicateurs —
    @Column(length = 2000,nullable = true)
    private String prerequis;
    @Column(length = 2000,nullable = true)
    private String acquis;
    @Column(length = 2000,nullable = true)
    private String indicateurs;




    @Column(nullable = true)
    private int chargeHoraireGlobal;

    @Column(name="certif_generated", nullable=false)
    private boolean certifGenerated = false;

    // Liste de séances
    @OneToMany(mappedBy = "formation", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)

    private List<SeanceFormation> seances;


    @ManyToOne
    @JoinColumn(name = "up_id", nullable = true) // Relation obligatoire
    private Up up;

    @ManyToOne
    @JoinColumn(name = "departement_id", nullable = true) // Relation obligatoire
    private Dept departement;

    @OneToMany(mappedBy = "formation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Document> documents;

    @OneToMany(
            mappedBy = "formation",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<Inscription> inscriptions = new ArrayList<>();

    @Column(name = "inscriptions_ouvertes", nullable = false)
    private boolean inscriptionsOuvertes = false;


    @Column(name = "ouverte", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean ouverte = false;





}
