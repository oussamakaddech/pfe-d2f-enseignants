package esprit.pfe.serviceformation.DTO;

import esprit.pfe.serviceformation.Entities.Dept;
import esprit.pfe.serviceformation.Entities.Up;
import jdk.jfr.SettingDefinition;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import java.util.Date;
import java.util.List;

@Getter
@Setter
@Data
public class FormationDTO {
    private Long idFormation;
    private String typeBesoin;
    private Long idBesoinFormation;
    private String titreFormation;
    private String typeFormation;
    private Date dateDebut;
    private Date dateFin;
    private String etatFormation;
    private float coutFormation;
    private String organismeRefExterne;
    private String externeFormateurNom;
    private String externeFormateurPrenom;
    private String externeFormateurEmail;
    private int chargeHoraireGlobal;
    private String domaine;
    private String competance;
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
    private Dept departement;
    private Up up;
    private List<SeanceDTO> seances;
    private DeptDTO departement1;
    private UpDTO up1;
    private boolean ouverte ;
    private boolean inscriptionsOuvertes ;
    private boolean certifGenerated ;

}

