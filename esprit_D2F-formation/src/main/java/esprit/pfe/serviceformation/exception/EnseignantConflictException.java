package esprit.pfe.serviceformation.exception;

import esprit.pfe.serviceformation.entities.Enseignant;

/**
 * Exception personnalisée pour les conflits d'enseignants.
 * Refactorisée pour réduire le nombre de paramètres du constructeur.
 */
public class EnseignantConflictException extends RuntimeException {

    private final String enseignantNom;
    private final String enseignantPrenom;
    private final String enseignantMail;
    private final String role;
    private final String dateSeance;
    private final String heureDebut;
    private final String heureFin;
    private final String formationTitre;

    public EnseignantConflictException(String role, Enseignant enseignant, String dateSeance, 
                                     String heureDebut, String heureFin, String formationTitre) {
        super(String.format("Conflit %s %s : seance le %s de %s a %s pour la formation %s",
                role, 
                enseignant.getNom() + " " + enseignant.getPrenom() + " (" + enseignant.getMail() + ")",
                dateSeance, heureDebut, heureFin, formationTitre));
        this.role = role;
        this.enseignantNom = enseignant.getNom();
        this.enseignantPrenom = enseignant.getPrenom();
        this.enseignantMail = enseignant.getMail();
        this.dateSeance = dateSeance;
        this.heureDebut = heureDebut;
        this.heureFin = heureFin;
        this.formationTitre = formationTitre;
    }

    public String getRole() {
        return role;
    }

    public String getEnseignantNom() {
        return enseignantNom;
    }

    public String getEnseignantPrenom() {
        return enseignantPrenom;
    }

    public String getEnseignantMail() {
        return enseignantMail;
    }

    public String getDateSeance() {
        return dateSeance;
    }

    public String getHeureDebut() {
        return heureDebut;
    }

    public String getHeureFin() {
        return heureFin;
    }

    public String getFormationTitre() {
        return formationTitre;
    }
}
