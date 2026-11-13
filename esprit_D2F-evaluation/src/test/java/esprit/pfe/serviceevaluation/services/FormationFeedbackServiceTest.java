package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.client.FormationClient;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackRequest;
import esprit.pfe.serviceevaluation.dto.FormationFeedbackStatsDTO;
import esprit.pfe.serviceevaluation.entities.FormationFeedback;
import esprit.pfe.serviceevaluation.repositories.FormationFeedbackRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationFeedbackService - questionnaire de satisfaction")
class FormationFeedbackServiceTest {

    @Mock private FormationFeedbackRepository repository;
    @Mock private FormationClient formationClient;
    @InjectMocks private FormationFeedbackService service;

    private static FormationFeedbackRequest request() {
        FormationFeedbackRequest r = new FormationFeedbackRequest();
        r.setFormationId(7L);
        r.setAspectOrganisationnel(4);
        r.setAspectTechnique(5);
        r.setAspectPedagogique(3);
        r.setBesoinComplementaire(true);
        r.setAutresInformations("  Très bien  ");
        r.setAutresBesoins(" ");
        return r;
    }

    @Test
    @DisplayName("Participant : réponse enregistrée avec fiche, UP et textes nettoyés")
    void submit_participant_saved() {
        when(formationClient.participantInfo(7L, "P1@esprit.tn"))
                .thenReturn(Map.of("participant", true, "enseignantId", "E1", "up", "UP Systèmes"));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FormationFeedback saved = service.submit("P1@esprit.tn", request());

        assertThat(saved.getEnseignantId()).isEqualTo("E1");
        assertThat(saved.getParticipantEmail()).isEqualTo("p1@esprit.tn");
        assertThat(saved.getUp()).isEqualTo("UP Systèmes");
        assertThat(saved.getAutresInformations()).isEqualTo("Très bien");
        assertThat(saved.getAutresBesoins()).isNull();
    }

    @Test
    @DisplayName("Non participant : refus ; service formation injoignable : refus explicite ; double réponse : refus")
    void submit_refusals() {
        when(formationClient.participantInfo(7L, "x@esprit.tn")).thenReturn(Map.of("participant", false));
        assertThrows(SecurityException.class, () -> service.submit("x@esprit.tn", request()));

        when(formationClient.participantInfo(7L, "y@esprit.tn")).thenReturn(null);
        assertThrows(IllegalStateException.class, () -> service.submit("y@esprit.tn", request()));

        when(formationClient.participantInfo(7L, "p1@esprit.tn"))
                .thenReturn(Map.of("participant", true, "enseignantId", "E1"));
        when(repository.existsByFormationIdAndEnseignantId(7L, "E1")).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.submit("p1@esprit.tn", request()));
        verify(repository, never()).save(any());
    }

    private static FormationFeedback fb(long formation, int org, int tech, int peda, boolean besoin, String up, String info) {
        return FormationFeedback.builder().formationId(formation).enseignantId("E" + org + tech + peda)
                .aspectOrganisationnel(org).aspectTechnique(tech).aspectPedagogique(peda)
                .besoinComplementaire(besoin).up(up).autresInformations(info).build();
    }

    @Test
    @DisplayName("Statistiques : répartition des 5 niveaux, moyennes, Oui/Non, par formation et par UP, commentaires")
    void stats_aggregates() {
        when(repository.findAll()).thenReturn(List.of(
                fb(1, 5, 4, 4, true, "Système", "Super"),
                fb(1, 4, 4, 5, false, "Système", null),
                fb(2, 2, 3, 1, true, null, null)));

        FormationFeedbackStatsDTO s = service.stats(null);

        assertThat(s.totalReponses()).isEqualTo(3);
        assertThat(s.aspects().get("organisationnel").repartition()).containsExactly(0L, 1L, 0L, 1L, 1L);
        assertThat(s.aspects().get("organisationnel").moyenne()).isEqualTo(3.67);
        assertThat(s.besoinComplementaire()).containsEntry("oui", 2L).containsEntry("non", 1L);
        assertThat(s.parFormation()).extracting(FormationFeedbackStatsDTO.FormationStats::formationId).containsExactly(1L, 2L);
        assertThat(s.parFormation().get(0).moyenne()).isEqualTo(4.33);
        assertThat(s.parUp()).containsEntry("Système", 2L).containsEntry("Non renseignée", 1L);
        assertThat(s.commentaires()).hasSize(1);
        assertThat(s.commentaires().get(0).autresInformations()).isEqualTo("Super");
    }

    @Test
    @DisplayName("Export : réponses individuelles triées par date, sans nom, e-mail ni fiche")
    void reponses_anonymousAndSorted() {
        FormationFeedback recente = fb(1, 5, 4, 4, true, "Système", "Super");
        recente.setId(2L);
        recente.setCreatedAt(java.time.LocalDateTime.of(2026, 9, 7, 11, 0));
        recente.setParticipantEmail("p1@esprit.tn");
        FormationFeedback ancienne = fb(2, 2, 3, 1, false, "IL", null);
        ancienne.setId(1L);
        ancienne.setCreatedAt(java.time.LocalDateTime.of(2026, 9, 1, 11, 24));
        when(repository.findAll()).thenReturn(List.of(recente, ancienne));

        var reponses = service.reponses(null);

        assertThat(reponses).extracting(FormationFeedbackStatsDTO.Reponse::id).containsExactly(1L, 2L);
        assertThat(reponses.get(1).up()).isEqualTo("Système");
        assertThat(reponses.get(1).toString()).doesNotContain("p1@esprit.tn").doesNotContain("E544");
    }

    @Test
    @DisplayName("Éligibilité certificat : réponse trouvée par id de fiche ou par e-mail")
    void isSubmitted_byIdOrMail() {
        when(repository.existsByFormationIdAndEnseignantId(7L, "E1")).thenReturn(true);
        assertThat(service.isSubmitted(7L, "E1")).isTrue();

        when(repository.existsByFormationIdAndEnseignantId(7L, "p2@esprit.tn")).thenReturn(false);
        when(repository.findByParticipantEmailIgnoreCase("p2@esprit.tn"))
                .thenReturn(List.of(FormationFeedback.builder().formationId(7L).build()));
        assertThat(service.isSubmitted(7L, "p2@esprit.tn")).isTrue();
    }
}
