package esprit.pfe.serviceformation.DTO;

import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.TypeFormation;
import esprit.pfe.serviceformation.Entities.TypeSeanceEnum;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
public class FormationWorkflowRequest {
    @NotBlank(message = "Le type de besoin est obligatoire")
    private String typeBesoin;

    private Long idBesoinFormation;

    @NotBlank(message = "Le titre de la formation est obligatoire")
    @Size(min = 5, max = 200, message = "Le titre doit contenir entre 5 et 200 caractères")
    private String titreFormation;

    @NotNull(message = "La date de début est obligatoire")
    private Date dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private Date dateFin;

    @NotNull(message = "Le type de formation est obligatoire")
    private TypeFormation typeFormation;

    private EtatFormation etatFormation;

    @PositiveOrZero(message = "Le coût de formation doit être positif ou nul")
    private float coutFormation;

    private String externeFormateurNom;
    private String externeFormateurPrenom;

    @Email(message = "Format d'email invalide")
    private String externeFormateurEmail;

    private String organismeRefExterne;

    @Min(value = 1, message = "La charge horaire globale doit être d'au moins 1 heure")
    private int chargeHoraireGlobal;

    private String upId;
    private String departementId;

    private String competance;
    private String domaine;
    private String populationCible;
    
    @NotBlank(message = "Les objectifs sont obligatoires")
    private String objectifs;
    
    private String objectifsPedago;
    private String evalMethods;
    
    @PositiveOrZero
    private Float coutTransport;
    @PositiveOrZero
    private Float coutHebergement;
    @PositiveOrZero
    private Float coutRepas;
    
    private String prerequis;
    private String acquis;
    private String indicateurs;

    private List<String> animateursIds;
    private List<String> participantsIds;

    @Valid
    private List<SeanceRequest> seances;

    private boolean ouverte = false;
    private boolean inscriptionsOuvertes = false;
    
    private String periodCode;
    private String customPeriodLabel;

    @Data
    public static class SeanceRequest {
        private Long idSeance;

        @NotNull(message = "La date de la séance est obligatoire")
        private Date dateSeance;

        @NotBlank(message = "L'heure de début est obligatoire")
        private String heureDebut;

        @NotBlank(message = "L'heure de fin est obligatoire")
        private String heureFin;

        private String salle;

        @NotNull(message = "Le type de séance est obligatoire")
        private TypeSeanceEnum typeSeance;

        private String contenus;
        private String methodes;
        
        @PositiveOrZero
        private Float dureeTheorique;
        @PositiveOrZero
        private Float dureePratique;
        
        private List<String> animateursIds;
        private List<String> participantsIds;
    }
}

