package esprit.pfe.serviceformation.Utils;

import java.util.Optional;

/**
 * Utilitaire pour standardiser la gestion des exceptions
 * Élimine les inconsistances entre RuntimeException, IllegalArgumentException et IllegalStateException
 */
public class ExceptionUtils {

    /**
     * Lance une IllegalArgumentException avec un message formaté
     * @param message Message d'erreur
     * @return Jamais retourné, pour faciliter l'utilisation avec throw
     */
    public static <T> T invalidArgument(String message) {
        throw new IllegalArgumentException(message);
    }

    /**
     * Lance une IllegalStateException avec un message formaté
     * @param message Message d'erreur
     * @return Jamais retourné, pour faciliter l'utilisation avec throw
     */
    public static <T> T invalidState(String message) {
        throw new IllegalStateException(message);
    }

    /**
     * Lance une IllegalStateException avec un message formaté et une cause
     * @param message Message d'erreur
     * @param cause Exception cause
     * @return Jamais retourné
     */
    public static <T> T invalidState(String message, Throwable cause) {
        throw new IllegalStateException(message, cause);
    }

    /**
     * Wrapper pour Optional qui lance une exception spécifique au métier
     * @param optional Optional à unwrapper
     * @param resourceName Nom de la ressource pour le message
     * @param id Identifiant de la ressource
     * @return T si present
     * @throws IllegalArgumentException si absent
     */
    public static <T> T orElseThrow(Optional<T> optional, String resourceName, Object id) {
        return optional.orElseThrow(() -> 
            new IllegalArgumentException(resourceName + " introuvable avec l'id: " + id));
    }

    /**
     * Wrapper pour Optional qui lance une exception spécifique au métier
     * @param optional Optional à unwrapper
     * @param message Message d'erreur personnalisé
     * @return T si present
     * @throws IllegalArgumentException si absent
     */
    public static <T> T orElseThrow(Optional<T> optional, String message) {
        return optional.orElseThrow(() -> new IllegalArgumentException(message));
    }

    /**
     * Convertit une exception en IllegalStateException
     * Utile pour wrapper les exceptions de la base de données ou des services externes
     * @param ex Exception à wrapper
     * @param contextMessage Contexte de l'erreur
     * @return Jamais retourné
     */
    public static <T> T wrapAsStateException(Exception ex, String contextMessage) {
        throw new IllegalStateException(contextMessage + ": " + ex.getMessage(), ex);
    }
}
