package esprit.pfe.serviceanalyse.service.passport;

import esprit.pfe.serviceanalyse.dto.passport.*;
import esprit.pfe.serviceanalyse.services.AnalysePredictiveService;
import esprit.pfe.serviceanalyse.service.client.AuthServiceClient;
import esprit.pfe.serviceanalyse.service.client.CertificatServiceClient;
import esprit.pfe.serviceanalyse.service.client.CompetenceServiceClient;
import esprit.pfe.serviceanalyse.service.client.FormationServiceClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SkillPassportAssemblerTest {

    @Mock private AuthServiceClient authClient;
    @Mock private CompetenceServiceClient competenceClient;
    @Mock private FormationServiceClient formationClient;
    @Mock private CertificatServiceClient certificatClient;
    @Mock private AnalysePredictiveService analysePredictiveService;

    @InjectMocks
    private SkillPassportAssembler assembler;

    // ── Test nominal ──────────────────────────────────────────────────────

    @Test
    void assemble_returnsCompletePassport() {
        TeacherIdentityDTO identity = TeacherIdentityDTO.builder()
                .username("jdoe").nom("Doe").prenom("John").email("jdoe@esprit.tn").build();

        DomainSummaryDTO domain = DomainSummaryDTO.builder()
                .nom("Informatique").scoreGlobal(3.5).totalSavoirs(5)
                .competences(Collections.emptyList()).build();

        TrainingHistoryDTO formation = TrainingHistoryDTO.builder()
                .formationId("10").titre("Spring Boot").statut("TERMINEE").build();

        CertificationSummaryDTO cert = CertificationSummaryDTO.builder()
                .certificatId(1L).titreFormation("Spring Boot").typeCertif("CERTIF").build();

        Map<String, Object> analyseResult = new HashMap<>();
        analyseResult.put("gaps", List.of(
                Map.of("competenceCode", "INF-01", "competenceLabel", "Python",
                       "niveauActuel", 1, "niveauCible", 4, "gap", 3.0,
                       "gravite", "élevée", "explication", "Écart de 3 niveaux")
        ));
        analyseResult.put("recommandationsFormations", List.of(
                Map.of("formationId", "5", "titre", "Python Avancé",
                       "dureeEstimee", "20h", "probabiliteReussite", 0.90,
                       "priorite", "haute", "justification", "Gap Python",
                       "competencesCiblees", List.of("Python"))
        ));

        when(authClient.getTeacherIdentity(eq("jdoe"), any())).thenReturn(identity);
        when(competenceClient.getDomainSummaries(eq("jdoe"), any())).thenReturn(List.of(domain));
        when(formationClient.getFormationsForTeacher(eq("jdoe"), any())).thenReturn(List.of(formation));
        when(certificatClient.getCertificationsForTeacher(eq("jdoe"), any())).thenReturn(List.of(cert));
        when(analysePredictiveService.analyserEnseignant(eq("jdoe"), isNull())).thenReturn(analyseResult);

        TeacherSkillPassportDTO passport = assembler.assemble("jdoe", "Bearer token");

        assertThat(passport).isNotNull();
        assertThat(passport.getIdentity().getUsername()).isEqualTo("jdoe");
        assertThat(passport.getDomaines()).hasSize(1);
        assertThat(passport.getFormations()).hasSize(1);
        assertThat(passport.getCertifications()).hasSize(1);
        assertThat(passport.getGaps()).hasSize(1);
        assertThat(passport.getGaps().get(0).getCompetenceCode()).isEqualTo("INF-01");
        assertThat(passport.getRecommandations()).hasSize(1);
        assertThat(passport.getTotalSavoirsMaitrises()).isEqualTo(5);
        assertThat(passport.getTotalFormations()).isEqualTo(1);
        assertThat(passport.getTotalGaps()).isEqualTo(1);
    }

    // ── Dégradation gracieuse si services indisponibles ───────────────────

    @Test
    void assemble_withEmptyServices_returnsPartialPassport() {
        TeacherIdentityDTO identity = TeacherIdentityDTO.builder().username("jdoe").build();

        when(authClient.getTeacherIdentity(eq("jdoe"), any())).thenReturn(identity);
        when(competenceClient.getDomainSummaries(eq("jdoe"), any())).thenReturn(Collections.emptyList());
        when(formationClient.getFormationsForTeacher(eq("jdoe"), any())).thenReturn(Collections.emptyList());
        when(certificatClient.getCertificationsForTeacher(eq("jdoe"), any())).thenReturn(Collections.emptyList());
        when(analysePredictiveService.analyserEnseignant(eq("jdoe"), isNull()))
                .thenReturn(Map.of("gaps", Collections.emptyList(),
                                   "recommandationsFormations", Collections.emptyList()));

        TeacherSkillPassportDTO passport = assembler.assemble("jdoe", null);

        assertThat(passport).isNotNull();
        assertThat(passport.getDomaines()).isEmpty();
        assertThat(passport.getGaps()).isEmpty();
        assertThat(passport.getScoreGlobal()).isEqualTo(0.0);
        assertThat(passport.getStatut()).isEqualTo("maîtrisé");
    }

    // ── Statut à_risque si gap élevé ─────────────────────────────────────

    @Test
    void assemble_withHighGap_returnsRisqueStatut() {
        TeacherIdentityDTO identity = TeacherIdentityDTO.builder().username("jdoe").build();
        DomainSummaryDTO domain = DomainSummaryDTO.builder()
                .nom("Maths").scoreGlobal(2.0).totalSavoirs(3)
                .competences(Collections.emptyList()).build();

        Map<String, Object> result = new HashMap<>();
        result.put("gaps", List.of(
                Map.of("competenceCode", "M1", "competenceLabel", "Algo",
                       "niveauActuel", 1, "niveauCible", 4, "gap", 3.0,
                       "gravite", "élevée", "explication", "Grand écart")
        ));
        result.put("recommandationsFormations", Collections.emptyList());

        when(authClient.getTeacherIdentity(any(), any())).thenReturn(identity);
        when(competenceClient.getDomainSummaries(any(), any())).thenReturn(List.of(domain));
        when(formationClient.getFormationsForTeacher(any(), any())).thenReturn(Collections.emptyList());
        when(certificatClient.getCertificationsForTeacher(any(), any())).thenReturn(Collections.emptyList());
        when(analysePredictiveService.analyserEnseignant(any(), any())).thenReturn(result);

        TeacherSkillPassportDTO passport = assembler.assemble("jdoe", null);

        assertThat(passport.getStatut()).isEqualTo("à_risque");
    }
}
