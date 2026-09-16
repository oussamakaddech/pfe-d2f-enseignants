package esprit.pfe.serviceformation.exception;

/**
 * Exception personnalisée pour les conflits de salle
 * Utilisée dans FormationWorkflowService et SeanceService
 */
public class SalleConflictException extends RuntimeException {

    private final String salle;
    private final String date;
    private final String heureDebut;
    private final String heureFin;

    public SalleConflictException(String salle, String date, String heureDebut, String heureFin) {
        super(String.format("Conflit de salle : %s est deja reservee le %s de %s a %s", 
                salle, date, heureDebut, heureFin));
        this.salle = salle;
        this.date = date;
        this.heureDebut = heureDebut;
        this.heureFin = heureFin;
    }

    public String getSalle() {
        return salle;
    }

    public String getDate() {
        return date;
    }

    public String getHeureDebut() {
        return heureDebut;
    }

    public String getHeureFin() {
        return heureFin;
    }
}
