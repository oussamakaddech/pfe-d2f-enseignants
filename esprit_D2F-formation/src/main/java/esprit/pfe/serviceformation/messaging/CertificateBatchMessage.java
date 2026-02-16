package esprit.pfe.serviceformation.messaging;


import lombok.Data;

import java.util.Date;
import java.util.List;



@Data
public class CertificateBatchMessage {

    private Long formationId;           // Identifiant unique de la formation
    private String titreFormation;      // Titre, ex. "Spring Boot Avancé"
    private String typeCertif;          // "CERTIF", "BADGE", "ATTESTATION", etc.

    // Dates de la formation
    private Date dateDebutFormation;    // ex. 2025-03-13
    private Date dateFinFormation;      // ex. 2025-03-13

    // Exemple : 40h de formation
    private Integer chargeHoraireGlobal;

    // Liste des enseignants CONCERNÉS par ce certificat
    // Dans ce scenario, vous ne récupérez QUE les animateurs
    private List<EnseignantPresenceInfo> enseignants;

    @Data
    public static class EnseignantPresenceInfo {
        private String enseignantId;         // ex. "E001"
        private String nom;                  // ex. "BEN MUSTAPHA"
        private String prenom;               // ex. "IBTIHEL"
        private String mail;                 // ex. "ibtihel.benmustapha@esprit.tn"

        // Comme vous n’avez plus de participants, vous pouvez mettre "ANIMATEUR"
        // ou laisser un champ pour évoluer plus tard (ex. "ANIMATEUR" / "CO-ANIMATEUR"…)
        private String role;

        // Département de l’enseignant, s’il faut l’afficher sur le certificat
        private String deptEnseignantLibelle;

        // Indique si l’animateur était réellement présent
        private boolean present;
    }
}


