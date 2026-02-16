package esprit.pfe.serviceformation.DTO;



import lombok.Getter;
import lombok.Setter;
import java.util.Date;
import java.util.List;

@Getter
@Setter
public class FormationWithDocumentsDTO {
    private Long idFormation;
    private String titreFormation;
    private String typeFormation;
    private Date dateDebut;
    private Date dateFin;
    private String etatFormation;
    private float coutFormation;
    private String organismeRefExterne;
    private int chargeHoraireGlobal;
    private DeptDTO departement1;
    private UpDTO up1;
    private List<DocumentDTO> documents;
}

