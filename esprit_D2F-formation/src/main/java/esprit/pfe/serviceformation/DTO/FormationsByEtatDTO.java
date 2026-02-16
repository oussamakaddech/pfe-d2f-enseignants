package esprit.pfe.serviceformation.DTO;



import lombok.Data;

@Data
public class FormationsByEtatDTO {
    private int total;
    private int enregistre;
    private int planifie;
    private int enCours;
    private int acheve;
    private int annule;
}

