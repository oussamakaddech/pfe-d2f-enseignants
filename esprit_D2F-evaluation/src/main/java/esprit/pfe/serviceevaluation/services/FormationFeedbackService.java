package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.client.FormationClient;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackRequest;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackStatsDTO;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackStatsDTO.AspectStats;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackStatsDTO.Commentaire;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackStatsDTO.FormationStats;
import esprit.pfe.serviceevaluation.entities.FormationFeedback;
import esprit.pfe.serviceevaluation.repositories.FormationFeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Questionnaire de satisfaction des participants (une réponse par participant et
 * par formation) et statistiques anonymes pour l'administration.
 */
@Service
@RequiredArgsConstructor
public class FormationFeedbackService {

    static final String ORGANISATIONNEL = "organisationnel";
    static final String TECHNIQUE = "technique";
    static final String PEDAGOGIQUE = "pedagogique";
    private static final String UP_NON_RENSEIGNEE = "Non renseignée";

    private final FormationFeedbackRepository repository;
    private final FormationClient formationClient;

    @Transactional
    public FormationFeedback submit(String email, FormationFeedbackRequest req) {
        if (email == null || email.isBlank()) {
            throw new SecurityException("Utilisateur non identifié.");
        }
        Map<String, Object> info = formationClient.participantInfo(req.getFormationId(), email);
        if (info == null) {
            throw new IllegalStateException("Service des formations indisponible : réessayez dans quelques instants.");
        }
        if (!Boolean.TRUE.equals(info.get("participant"))) {
            throw new SecurityException("Seuls les participants de cette formation peuvent l'évaluer.");
        }
        String enseignantId = info.get("enseignantId") != null ? info.get("enseignantId").toString() : email.toLowerCase(Locale.ROOT);
        if (repository.existsByFormationIdAndEnseignantId(req.getFormationId(), enseignantId)) {
            throw new IllegalStateException("Vous avez déjà évalué cette formation.");
        }
        FormationFeedback feedback = FormationFeedback.builder()
                .formationId(req.getFormationId())
                .enseignantId(enseignantId)
                .participantEmail(email.toLowerCase(Locale.ROOT))
                .up(info.get("up") != null ? info.get("up").toString() : null)
                .aspectOrganisationnel(req.getAspectOrganisationnel())
                .aspectTechnique(req.getAspectTechnique())
                .aspectPedagogique(req.getAspectPedagogique())
                .besoinComplementaire(req.getBesoinComplementaire())
                .autresInformations(blankToNull(req.getAutresInformations()))
                .autresBesoins(blankToNull(req.getAutresBesoins()))
                .build();
        return repository.save(feedback);
    }

    /** Formations déjà évaluées par l'utilisateur connecté. */
    @Transactional(readOnly = true)
    public List<Long> formationsEvaluees(String email) {
        if (email == null) {
            return List.of();
        }
        return repository.findByParticipantEmailIgnoreCase(email).stream()
                .map(FormationFeedback::getFormationId).distinct().toList();
    }

    /** Éligibilité aux certificats : le participant (id de fiche ou e-mail) a-t-il répondu ? */
    @Transactional(readOnly = true)
    public boolean isSubmitted(Long formationId, String participantId) {
        if (repository.existsByFormationIdAndEnseignantId(formationId, participantId)) {
            return true;
        }
        return repository.findByParticipantEmailIgnoreCase(participantId).stream()
                .anyMatch(f -> formationId.equals(f.getFormationId()));
    }

    /** Statistiques anonymes, toutes formations ({@code formationId} null) ou une seule. */
    @Transactional(readOnly = true)
    public FormationFeedbackStatsDTO stats(Long formationId) {
        List<FormationFeedback> all = formationId == null ? repository.findAll() : repository.findByFormationId(formationId);

        Map<String, AspectStats> aspects = new LinkedHashMap<>();
        aspects.put(ORGANISATIONNEL, aspect(all, FormationFeedback::getAspectOrganisationnel));
        aspects.put(TECHNIQUE, aspect(all, FormationFeedback::getAspectTechnique));
        aspects.put(PEDAGOGIQUE, aspect(all, FormationFeedback::getAspectPedagogique));

        long oui = all.stream().filter(f -> Boolean.TRUE.equals(f.getBesoinComplementaire())).count();
        Map<String, Long> besoin = new LinkedHashMap<>();
        besoin.put("oui", oui);
        besoin.put("non", all.size() - oui);

        List<FormationStats> parFormation = all.stream()
                .collect(Collectors.groupingBy(FormationFeedback::getFormationId, LinkedHashMap::new, Collectors.toList()))
                .entrySet().stream()
                .map(e -> new FormationStats(e.getKey(), e.getValue().size(), moyenneGenerale(e.getValue())))
                .sorted(Comparator.comparingLong(FormationStats::reponses).reversed())
                .toList();

        Map<String, Long> parUp = all.stream()
                .collect(Collectors.groupingBy(f -> f.getUp() == null || f.getUp().isBlank() ? UP_NON_RENSEIGNEE : f.getUp(),
                        TreeMap::new, Collectors.counting()));

        List<Commentaire> commentaires = all.stream()
                .filter(f -> f.getAutresInformations() != null || f.getAutresBesoins() != null)
                .sorted(Comparator.comparing(FormationFeedback::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(f -> new Commentaire(f.getFormationId(), f.getCreatedAt(), f.getAutresInformations(), f.getAutresBesoins()))
                .toList();

        return new FormationFeedbackStatsDTO(all.size(), aspects, besoin, parFormation, parUp, commentaires);
    }

    /** Réponses individuelles anonymes, de la plus ancienne à la plus récente (export Excel). */
    @Transactional(readOnly = true)
    public List<FormationFeedbackStatsDTO.Reponse> reponses(Long formationId) {
        List<FormationFeedback> all = formationId == null ? repository.findAll() : repository.findByFormationId(formationId);
        return all.stream()
                .sorted(Comparator.comparing(FormationFeedback::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FormationFeedback::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(f -> new FormationFeedbackStatsDTO.Reponse(f.getId(), f.getCreatedAt(), f.getFormationId(), f.getUp(),
                        f.getAspectOrganisationnel(), f.getAspectTechnique(), f.getAspectPedagogique(),
                        f.getBesoinComplementaire(), f.getAutresInformations(), f.getAutresBesoins()))
                .toList();
    }

    private static AspectStats aspect(List<FormationFeedback> all, Function<FormationFeedback, Integer> note) {
        List<Long> repartition = new ArrayList<>(Collections.nCopies(5, 0L));
        all.stream().map(note).filter(Objects::nonNull).filter(n -> n >= 1 && n <= 5)
                .forEach(n -> repartition.set(n - 1, repartition.get(n - 1) + 1));
        OptionalDouble avg = all.stream().map(note).filter(Objects::nonNull).mapToInt(Integer::intValue).average();
        return new AspectStats(repartition, avg.isPresent() ? arrondi(avg.getAsDouble()) : null);
    }

    private static Double moyenneGenerale(List<FormationFeedback> list) {
        OptionalDouble avg = list.stream()
                .mapToDouble(f -> (f.getAspectOrganisationnel() + f.getAspectTechnique() + f.getAspectPedagogique()) / 3.0)
                .average();
        return avg.isPresent() ? arrondi(avg.getAsDouble()) : null;
    }

    private static double arrondi(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
