package esprit.pfe.serviceformation.microsoft;

import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Garde-fous de l'envoi d'e-mails libres ({@code POST /api/v1/mail/send}) depuis
 * la boîte institutionnelle (Microsoft Graph).
 *
 * <ul>
 *   <li>un seul destinataire, adresse syntaxiquement valide ;</li>
 *   <li>destinataire de l'établissement (domaines {@code d2f.mail.allowed-domains},
 *       sous-domaines compris) ou déjà connu de la plateforme (fiche enseignant,
 *       animateur externe) — jamais une adresse arbitraire ;</li>
 *   <li>quota par expéditeur sur une heure glissante ({@code d2f.mail.max-per-hour}).</li>
 * </ul>
 */
@Component
public class MailSendPolicy {

    private static final Pattern ADDRESS =
            Pattern.compile("^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$");
    private static final Duration WINDOW = Duration.ofHours(1);

    private final EnseignantRepository enseignantRepository;
    private final AnimateurExterneRepository animateurExterneRepository;
    private final Set<String> allowedDomains;
    private final int maxPerHour;
    private final Clock clock;
    private final Map<String, Deque<Instant>> sentBySender = new ConcurrentHashMap<>();

    @Autowired
    public MailSendPolicy(EnseignantRepository enseignantRepository,
                          AnimateurExterneRepository animateurExterneRepository,
                          @Value("${d2f.mail.allowed-domains:esprit.tn}") String allowedDomains,
                          @Value("${d2f.mail.max-per-hour:30}") int maxPerHour) {
        this(enseignantRepository, animateurExterneRepository, allowedDomains, maxPerHour, Clock.systemUTC());
    }

    MailSendPolicy(EnseignantRepository enseignantRepository,
                   AnimateurExterneRepository animateurExterneRepository,
                   String allowedDomains, int maxPerHour, Clock clock) {
        this.enseignantRepository = enseignantRepository;
        this.animateurExterneRepository = animateurExterneRepository;
        this.allowedDomains = Arrays.stream(allowedDomains.split(","))
                .map(d -> d.trim().toLowerCase(Locale.ROOT))
                .filter(d -> !d.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.maxPerHour = maxPerHour;
        this.clock = clock;
    }

    /**
     * Vérifie le destinataire et renvoie l'adresse normalisée.
     *
     * @throws IllegalArgumentException si l'adresse est invalide, multiple ou non autorisée
     */
    public String checkRecipient(String to) {
        String address = to == null ? "" : to.trim();
        if (!ADDRESS.matcher(address).matches()) {
            throw new IllegalArgumentException(
                    "Destinataire invalide : une seule adresse e-mail valide est acceptée.");
        }
        if (isInstitutional(address) || isKnownToThePlatform(address)) {
            return address;
        }
        throw new IllegalArgumentException("Destinataire non autorisé : seules les adresses de "
                + "l'établissement ou déjà enregistrées dans la plateforme sont acceptées.");
    }

    /**
     * Décompte un envoi pour l'expéditeur.
     *
     * @throws QuotaExceededException si le quota horaire est atteint
     */
    public void consumeQuota(String sender) {
        Instant now = clock.instant();
        Deque<Instant> sent = sentBySender.computeIfAbsent(sender, k -> new ArrayDeque<>());
        synchronized (sent) {
            while (!sent.isEmpty() && sent.peekFirst().isBefore(now.minus(WINDOW))) {
                sent.pollFirst();
            }
            if (sent.size() >= maxPerHour) {
                throw new QuotaExceededException("Quota d'envoi atteint (" + maxPerHour
                        + " e-mails par heure). Réessayez plus tard.");
            }
            sent.addLast(now);
        }
    }

    private boolean isInstitutional(String address) {
        String domain = address.substring(address.indexOf('@') + 1).toLowerCase(Locale.ROOT);
        return allowedDomains.stream().anyMatch(d -> domain.equals(d) || domain.endsWith("." + d));
    }

    private boolean isKnownToThePlatform(String address) {
        return enseignantRepository.findByMailIgnoreCase(address).isPresent()
                || animateurExterneRepository.existsByEmailIgnoreCase(address);
    }

    /** Quota d'envoi dépassé (HTTP 429). */
    public static class QuotaExceededException extends RuntimeException {
        public QuotaExceededException(String message) {
            super(message);
        }
    }
}
