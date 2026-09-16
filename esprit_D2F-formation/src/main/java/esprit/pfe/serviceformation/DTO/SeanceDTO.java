package esprit.pfe.serviceformation.dto;



import esprit.pfe.serviceformation.entities.TypeSeanceEnum;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
@Getter
@Setter
public class SeanceDTO implements Serializable {
    private Long idSeance;
    private LocalDate dateSeance;
    private LocalTime heureDebut;
    private LocalTime heureFin;
    private String salle;
    private TypeSeanceEnum typeSeance;
    private String contenus;
    private String methodes;
    private Float dureeTheorique;
    private Float dureePratique;
    private String onlineMeetingUrl;  // URL de réunion Teams
    private List<EnseignantDTO> animateurs;
    private List<EnseignantDTO> participants;


}

