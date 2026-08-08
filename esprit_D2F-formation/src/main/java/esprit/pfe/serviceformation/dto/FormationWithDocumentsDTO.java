package esprit.pfe.serviceformation.dto;



import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class FormationWithDocumentsDTO {
    private Long idFormation;
    private String titreFormation;
    private String typeFormation;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String etatFormation;
    private Float coutFormation;
    private String organismeRefExterne;
    private Integer chargeHoraireGlobal;
    private DeptDTO departement1;
    private UpDTO up1;
    private List<DocumentDTO> documents;
    private String periodCode;
    private String customPeriodLabel;
}

