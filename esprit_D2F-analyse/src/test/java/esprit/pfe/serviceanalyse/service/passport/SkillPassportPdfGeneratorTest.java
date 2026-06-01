package esprit.pfe.serviceanalyse.service.passport;

import esprit.pfe.serviceanalyse.dto.passport.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.assertj.core.api.Assertions.*;

class SkillPassportPdfGeneratorTest {

    private SkillPassportPdfGenerator generator;

    @BeforeEach
    void setup() {
        generator = new SkillPassportPdfGenerator();
    }

    private TeacherSkillPassportDTO buildSamplePassport() {
        TeacherIdentityDTO identity = TeacherIdentityDTO.builder()
                .username("jdoe").prenom("John").nom("Doe")
                .email("jdoe@esprit.tn").role("ROLE_ENSEIGNANT").build();

        SavoirSummaryDTO savoir = SavoirSummaryDTO.builder()
                .code("SC-01").nom("Programmation Java").type("SAVOIR")
                .niveau("N3_INTERMEDIAIRE").niveauLabel("N3 – Intermédiaire").niveauNumeric(3).build();

        CompetenceSummaryDTO competence = CompetenceSummaryDTO.builder()
                .nom("Développement Java").niveauMoyen(3.0)
                .savoirs(List.of(savoir)).build();

        DomainSummaryDTO domain = DomainSummaryDTO.builder()
                .nom("Informatique").scoreGlobal(3.0).totalSavoirs(1)
                .competences(List.of(competence)).build();

        TrainingHistoryDTO formation = TrainingHistoryDTO.builder()
                .formationId("10").titre("Spring Boot 3").dateDebut("2024-01-15")
                .dateFin("2024-02-10").duree("40h").statut("TERMINEE")
                .competencesCiblees(List.of("Spring", "Microservices")).build();

        CertificationSummaryDTO cert = CertificationSummaryDTO.builder()
                .certificatId(1L).titreFormation("Spring Boot 3").typeCertif("CERTIF")
                .dateObtention("2024-02-10").build();

        SkillGapSummaryDTO gap = SkillGapSummaryDTO.builder()
                .competenceCode("INF-02").competenceLabel("Python")
                .niveauActuel(1).niveauCible(4).gap(3.0)
                .gravite("élevée").explication("Écart de 3 niveaux").build();

        RecommendationSummaryDTO reco = RecommendationSummaryDTO.builder()
                .formationId("5").titre("Python Avancé").duree("30h")
                .competencesCiblees(List.of("Python")).probabiliteReussite(0.90)
                .priorite("haute").justification("Formation ciblant les gaps Python").build();

        return TeacherSkillPassportDTO.builder()
                .identity(identity)
                .dateGeneration("2026-05-14T10:00:00")
                .scoreGlobal(3.2)
                .statut("en_progression")
                .totalSavoirsMaitrises(1)
                .totalFormations(1)
                .totalCertifications(1)
                .totalGaps(1)
                .domaines(List.of(domain))
                .formations(List.of(formation))
                .certifications(List.of(cert))
                .gaps(List.of(gap))
                .recommandations(List.of(reco))
                .build();
    }

    @Test
    void generate_returnsNonEmptyPdf() {
        TeacherSkillPassportDTO passport = buildSamplePassport();
        byte[] pdf = generator.generate(passport);

        assertThat(pdf).isNotNull().hasSizeGreaterThan(1000); // PDF minimum bytes
    }

    @Test
    void generate_pdfStartsWithPdfMagicBytes() {
        byte[] pdf = generator.generate(buildSamplePassport());
        // Un fichier PDF valide commence toujours par %PDF
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    void generate_withEmptyLists_doesNotThrow() {
        TeacherSkillPassportDTO emptyPassport = TeacherSkillPassportDTO.builder()
                .identity(TeacherIdentityDTO.builder().username("x").nom("X").prenom("X").build())
                .dateGeneration("2026-05-14T10:00:00")
                .scoreGlobal(0.0)
                .statut("inconnu")
                .totalSavoirsMaitrises(0).totalFormations(0)
                .totalCertifications(0).totalGaps(0)
                .domaines(Collections.emptyList())
                .formations(Collections.emptyList())
                .certifications(Collections.emptyList())
                .gaps(Collections.emptyList())
                .recommandations(Collections.emptyList())
                .build();

        assertThatCode(() -> generator.generate(emptyPassport)).doesNotThrowAnyException();
    }

    @Test
    void generate_withNullLists_doesNotThrow() {
        TeacherSkillPassportDTO nullPassport = TeacherSkillPassportDTO.builder()
                .identity(TeacherIdentityDTO.builder().username("x").build())
                .dateGeneration("2026-05-14T10:00:00")
                .scoreGlobal(0.0).statut("maîtrisé")
                .totalSavoirsMaitrises(0).totalFormations(0)
                .totalCertifications(0).totalGaps(0)
                .domaines(null).formations(null).certifications(null)
                .gaps(null).recommandations(null)
                .build();

        assertThatCode(() -> generator.generate(nullPassport)).doesNotThrowAnyException();
    }

    @Test
    void generate_withHighScore_producesPdf() {
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setScoreGlobal(5.0);
        passport.setStatut("maîtrisé");
        passport.setGaps(Collections.emptyList());
        passport.setTotalGaps(0);

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }
}
