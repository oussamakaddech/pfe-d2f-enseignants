package esprit.pfe.serviceformation.DTO;



import lombok.Data;
import java.util.List;

@Data
public class OneDriveItemDTO {
    private String id;
    private String name;
    private boolean folder;      // true si c'est un dossier, false pour un fichier
    private String downloadUrl;  // Pour les fichiers, le lien de téléchargement (webUrl)
    private Long fileSize;       // Taille (en octets) du fichier
    private List<OneDriveItemDTO> children;  // Enfants du dossier (si folder == true)
    private String parentName;  // 🔁 Nouveau champ pour identifier le dossier parent du fichier

}

