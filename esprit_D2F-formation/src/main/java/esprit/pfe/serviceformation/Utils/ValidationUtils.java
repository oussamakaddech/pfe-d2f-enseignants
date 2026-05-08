package esprit.pfe.serviceformation.Utils; // NOSONAR - project-wide convention

import org.springframework.stereotype.Component;
import java.util.*;

/**
 * Utilitaire de validation centralisé pour éviter les duplications
 * et standardiser la gestion des erreurs
 */
@Component
public class ValidationUtils {

    /**
     * Valide qu'un objet n'est pas null
     * @param obj Objet à valider
     * @param fieldName Nom du champ pour le message d'erreur
     * @throws IllegalArgumentException si l'objet est null
     */
    public void notNull(Object obj, String fieldName) {
        if (obj == null) {
            throw new IllegalArgumentException(fieldName + " ne peut pas être null");
        }
    }

    /**
     * Valide qu'une collection n'est pas vide
     * @param collection Collection à valider
     * @param fieldName Nom du champ pour le message d'erreur
     * @throws IllegalArgumentException si la collection est vide
     */
    public void notEmpty(Collection<?> collection, String fieldName) {
        if (collection == null || collection.isEmpty()) {
            throw new IllegalArgumentException(fieldName + " ne peut pas être vide");
        }
    }

    /**
     * Valide qu'une chaîne n'est pas vide
     * @param str Chaîne à valider
     * @param fieldName Nom du champ pour le message d'erreur
     * @throws IllegalArgumentException si la chaîne est vide
     */
    public void notBlank(String str, String fieldName) {
        if (str == null || str.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " ne peut pas être vide");
        }
    }

    /**
     * Valide qu'un identifiant est positif
     * @param id Identifiant à valider
     * @param fieldName Nom du champ pour le message d'erreur
     * @throws IllegalArgumentException si l'ID est invalide
     */
    public void validId(Long id, String fieldName) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(fieldName + " doit être un entier positif, reçu: " + id);
        }
    }

    /**
     * Valide qu'une date de fin est après la date de début
     * @param debut Date de début
     * @param fin Date de fin
     * @throws IllegalArgumentException si fin <= debut
     */
    public void dateRange(Date debut, Date fin) {
        notNull(debut, "Date de début");
        notNull(fin, "Date de fin");
        if (!fin.after(debut)) {
            throw new IllegalArgumentException("La date de fin doit être après la date de début");
        }
    }

    /**
     * Valide qu'une heure de fin est après l'heure de début
     * @param debut Heure de début
     * @param fin Heure de fin
     * @throws IllegalArgumentException si fin <= debut
     */
    public void timeRange(java.sql.Time debut, java.sql.Time fin) {
        notNull(debut, "Heure de début");
        notNull(fin, "Heure de fin");
        if (!fin.after(debut)) {
            throw new IllegalArgumentException("L'heure de fin doit être après l'heure de début");
        }
    }
}
