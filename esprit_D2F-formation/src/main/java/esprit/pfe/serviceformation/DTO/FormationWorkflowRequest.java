package esprit.pfe.serviceformation.DTO;

import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.TypeFormation;
import esprit.pfe.serviceformation.Entities.TypeSeanceEnum;
import jakarta.persistence.Column;
import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
public class FormationWorkflowRequest {
    private String typeBesoin;
    private Long idBesoinFormation;
    private String titreFormation;
    private Date dateDebut;
    private Date dateFin;
    private TypeFormation typeFormation;
    private EtatFormation etatFormation;
    private float coutFormation;
    private String externeFormateurNom;
    private String externeFormateurPrenom;
    private String externeFormateurEmail;
    private String organismeRefExterne;
    private int chargeHoraireGlobal;
    private String upId;
    private String departementId;



    // Nouveaux champs pour enrichir la formation
    private String competance;
    private String domaine;
    private String populationCible;
    private String objectifs;
    private String objectifsPedago;
    private String evalMethods;
    private Float coutTransport;
    private Float coutHebergement;
    private Float coutRepas;
    private String prerequis;
    private String acquis;
    private String indicateurs;

    private List<String> animateursIds;
    private List<String> participantsIds;
    private List<SeanceRequest> seances;
    private boolean ouverte = false;
    private boolean inscriptionsOuvertes = false;

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
        private Float dureeTheorique;
        private Float dureePratique;
        private List<String> animateursIds;
        private List<String> participantsIds;
    }
}
