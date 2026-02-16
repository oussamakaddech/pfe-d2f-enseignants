package esprit.pfe.serviceformation.DTO;



import esprit.pfe.serviceformation.Entities.TypeSeanceEnum;
import lombok.Getter;
import lombok.Setter;

import java.sql.Time;
import java.util.Date;
import java.util.List;
@Getter
@Setter
public class SeanceDTO {
    private Long idSeance;
    private Date dateSeance;
    private Time heureDebut;
    private Time heureFin;
    private String salle;
    private TypeSeanceEnum typeSeance;
    private String contenus;
    private String methodes;
    private Float dureeTheorique;
    private Float dureePratique;
    private List<EnseignantDTO> animateurs;
    private List<EnseignantDTO> participants;


}

