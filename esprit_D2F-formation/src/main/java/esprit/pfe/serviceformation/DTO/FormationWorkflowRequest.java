package esprit.pfe.serviceformation.dto;

import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.entities.TypeSeanceEnum;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
public class FormationWorkflowRequest {
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

    private Float coutFormation;

    private String externeFormateurNom;
    private String externeFormateurPrenom;

    @Email(message = "Format d'email invalide")
    private String externeFormateurEmail;

    private String organismeRefExterne;

    private Integer chargeHoraireGlobal;

    private String upId;
    private String departementId;

    private String competance;
    private String domaine;
    private String populationCible;
    
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

        private Date dateSeance;

        private String heureDebut;

        private String heureFin;

        private String salle;

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

