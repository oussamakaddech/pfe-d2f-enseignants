package esprit.pfe.serviceanalyse.service.passport;

import esprit.pfe.serviceanalyse.dto.passport.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
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

    @Test
    void generate_withNullCompetencesInDomain_doesNotThrow() {
        DomainSummaryDTO domain = DomainSummaryDTO.builder()
                .nom("Maths").scoreGlobal(2.0).totalSavoirs(0).competences(null).build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setDomaines(List.of(domain));
        passport.setStatut("à_risque");
        passport.setTotalGaps(0);

        assertThatCode(() -> generator.generate(passport)).doesNotThrowAnyException();
    }

    @Test
    void generate_withNullSavoirsInCompetence_doesNotThrow() {
        CompetenceSummaryDTO comp = CompetenceSummaryDTO.builder()
                .nom("Algèbre").niveauMoyen(2.0).savoirs(null).build();
        DomainSummaryDTO domain = DomainSummaryDTO.builder()
                .nom("Maths").scoreGlobal(2.0).totalSavoirs(0).competences(List.of(comp)).build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setDomaines(List.of(domain));

        assertThatCode(() -> generator.generate(passport)).doesNotThrowAnyException();
    }

    @Test
    void generate_withSavoirFaireAndSavoirEtreTypes_producesPdf() {
        SavoirSummaryDTO sf = SavoirSummaryDTO.builder()
                .code("SF-01").nom("Django").type("SAVOIR_FAIRE")
                .niveau("N4_AVANCE").niveauLabel("N4 – Avancé").niveauNumeric(4).dateAcquisition(LocalDate.parse("2025-01-01")).build();
        SavoirSummaryDTO se = SavoirSummaryDTO.builder()
                .code("SE-01").nom("Leadership").type("SAVOIR_ETRE")
                .niveau("N5_EXPERT").niveauLabel("N5 – Expert").niveauNumeric(5).build();
        CompetenceSummaryDTO comp = CompetenceSummaryDTO.builder()
                .nom("Dev").niveauMoyen(4.5).savoirs(List.of(sf, se)).build();
        DomainSummaryDTO domain = DomainSummaryDTO.builder()
                .nom("Info").scoreGlobal(4.5).totalSavoirs(2).competences(List.of(comp)).build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setDomaines(List.of(domain));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withBadgeAndAttestationCertifs_producesPdf() {
        CertificationSummaryDTO badge = CertificationSummaryDTO.builder()
                .certificatId(2L).titreFormation("AWS").typeCertif("BADGE").dateObtention("2025-03-01").build();
        CertificationSummaryDTO attest = CertificationSummaryDTO.builder()
                .certificatId(3L).titreFormation("Docker").typeCertif("ATTESTATION").dateObtention("2025-04-01").build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setCertifications(List.of(badge, attest));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withEnCoursFormationAndMoyenneGap_doesNotThrow() {
        TrainingHistoryDTO encours = TrainingHistoryDTO.builder()
                .formationId("11").titre("Angular").statut("EN_COURS").build();
        SkillGapSummaryDTO gapMoyen = SkillGapSummaryDTO.builder()
                .competenceCode("INF-03").competenceLabel("JS").niveauActuel(2).niveauCible(4)
                .gap(2.0).gravite("moyenne").explication("Écart modéré").build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setFormations(List.of(encours));
        passport.setGaps(List.of(gapMoyen));

        assertThatCode(() -> generator.generate(passport)).doesNotThrowAnyException();
    }

    @Test
    void generate_withLowScoreAndRisqueStatut_producesPdf() {
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setScoreGlobal(1.5);
        passport.setStatut("à_risque");

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withMoyennePrioriteAndEmptyCompetences_doesNotThrow() {
        RecommendationSummaryDTO reco = RecommendationSummaryDTO.builder()
                .formationId("6").titre("Kubernetes").duree("20h").probabiliteReussite(0.75)
                .priorite("moyenne").justification("Formation utile").competencesCiblees(Collections.emptyList()).build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setRecommandations(List.of(reco));

        assertThatCode(() -> generator.generate(passport)).doesNotThrowAnyException();
    }

    @Test
    void generate_withHighGraviteAndLowPriorite_doesNotThrow() {
        SkillGapSummaryDTO gap = SkillGapSummaryDTO.builder()
                .competenceCode("INF-04").competenceLabel("Scala").niveauActuel(1).niveauCible(4)
                .gap(3.0).gravite("élevée").explication("Très grand écart").build();
        RecommendationSummaryDTO reco = RecommendationSummaryDTO.builder()
                .formationId("7").titre("Scala Avancé").duree("30h").probabiliteReussite(0.60)
                .priorite("basse").justification("Long terme").competencesCiblees(List.of("Scala")).build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setGaps(List.of(gap));
        passport.setRecommandations(List.of(reco));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withNullStatutAndValideFormation_producesPdf() {
        TrainingHistoryDTO valide = TrainingHistoryDTO.builder()
                .formationId("12").titre("React").statut("VALIDE").build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setStatut(null);
        passport.setFormations(List.of(valide));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withNullIdentity_throwsException() {
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setIdentity(null);
        assertThatThrownBy(() -> generator.generate(passport))
                .isInstanceOf(esprit.pfe.serviceanalyse.exception.PdfGenerationException.class);
    }

    @Test
    void generate_withLowNiveauSavoir_producesPdf() {
        SavoirSummaryDTO low = SavoirSummaryDTO.builder()
                .code("S01").nom("Base").type("SAVOIR")
                .niveau("N1_DEBUTANT").niveauLabel("Débutant").niveauNumeric(1).build();
        CompetenceSummaryDTO comp = CompetenceSummaryDTO.builder()
                .nom("Base").niveauMoyen(1.0).savoirs(List.of(low)).build();
        DomainSummaryDTO domain = DomainSummaryDTO.builder()
                .nom("Info").scoreGlobal(1.0).totalSavoirs(1).competences(List.of(comp)).build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setDomaines(List.of(domain));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withPlannedFormation_producesPdf() {
        TrainingHistoryDTO planned = TrainingHistoryDTO.builder()
                .formationId("13").titre("Docker").statut("PLANIFIEE").build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setFormations(List.of(planned));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withFaibleGravite_producesPdf() {
        SkillGapSummaryDTO gap = SkillGapSummaryDTO.builder()
                .competenceCode("INF-05").competenceLabel("Rust").niveauActuel(3).niveauCible(4)
                .gap(1.0).gravite("faible").explication("Écart mineur").build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setGaps(List.of(gap));
        passport.setTotalGaps(1);

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withOtherCertType_producesPdf() {
        CertificationSummaryDTO other = CertificationSummaryDTO.builder()
                .certificatId(4L).titreFormation("Kubernetes").typeCertif("AUTRE").dateObtention("2025-05-01").build();
        CertificationSummaryDTO nullType = CertificationSummaryDTO.builder()
                .certificatId(5L).titreFormation("Terraform").typeCertif(null).dateObtention("2025-06-01").build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setCertifications(List.of(other, nullType));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }

    @Test
    void generate_withLongExplanation_truncates() {
        SkillGapSummaryDTO gap = SkillGapSummaryDTO.builder()
                .competenceCode("INF-06").competenceLabel("Kotlin").niveauActuel(1).niveauCible(4)
                .gap(3.0).gravite("élevée")
                .explication("Cet écart de compétence est très important et nécessite une attention immédiate avec un plan de formation dédié")
                .build();
        TeacherSkillPassportDTO passport = buildSamplePassport();
        passport.setGaps(List.of(gap));

        byte[] pdf = generator.generate(passport);
        assertThat(pdf).isNotNull().hasSizeGreaterThan(100);
    }
}
