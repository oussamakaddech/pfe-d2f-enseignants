package tn.esprit.d2f.competence.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import tn.esprit.d2f.competence.dto.*;
import tn.esprit.d2f.competence.entity.*;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DisplayName("CompetenceMapper - Tests unitaires")
class CompetenceMapperTest {

    // ── Helpers ───────────────────────────────────────────────────────────────

    static Domaine buildDomaine() {
        Domaine d = Domaine.builder()
                .id(1L).code("GC-TECH").nom("Technique Génie Civil")
                .description("Domaine technique").actif(true)
                .competences(new ArrayList<>()).build();
        return d;
    }

    static Competence buildCompetence(Domaine domaine) {
        return Competence.builder()
                .id(2L).code("GC-C1").nom("Compétences Sols").description("desc").ordre(1)
                .domaine(domaine).sousCompetences(new ArrayList<>()).savoirs(new ArrayList<>())
                .build();
    }

    static SousCompetence buildSousCompetence(Competence c) {
        return SousCompetence.builder()
                .id(3L).code("SC-01").nom("Essais géotechniques").description("desc")
                .competence(c).savoirs(new ArrayList<>()).build();
    }

    static Savoir buildSavoir(SousCompetence sc) {
        return Savoir.builder()
                .id(4L).code("S2a").nom("Essai de classification").description("desc")
                .type(TypeSavoir.PRATIQUE).niveau(NiveauMaitrise.N1_DEBUTANT)
                .sousCompetence(sc).build();
    }

    // ── toDTO(Domaine) ────────────────────────────────────────────────────────
    @Nested
    @DisplayName("toDTO(Domaine)")
    class ToDTODomaine {

        @Test
        @DisplayName("mappe tous les champs scalaires")
        void shouldMapScalarFields() {
            Domaine domaine = buildDomaine();
            DomaineDTO dto = CompetenceMapper.toDTO(domaine);

            assertThat(dto.getId()).isEqualTo(1L);
            assertThat(dto.getCode()).isEqualTo("GC-TECH");
            assertThat(dto.getNom()).isEqualTo("Technique Génie Civil");
            assertThat(dto.getDescription()).isEqualTo("Domaine technique");
            assertThat(dto.getActif()).isTrue();
        }

        @Test
        @DisplayName("mappe la liste des compétences (vide → liste vide)")
        void shouldMapEmptyCompetences() {
            DomaineDTO dto = CompetenceMapper.toDTO(buildDomaine());
            assertThat(dto.getCompetences()).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("mappe les compétences imbriquées")
        void shouldMapNestedCompetences() {
            Domaine domaine = buildDomaine();
            Competence c = buildCompetence(domaine);
            domaine.setCompetences(List.of(c));

            DomaineDTO dto = CompetenceMapper.toDTO(domaine);

            assertThat(dto.getCompetences()).hasSize(1);
            assertThat(dto.getCompetences().get(0).getCode()).isEqualTo("GC-C1");
        }
    }

    // ── toDTOLight(Domaine) ───────────────────────────────────────────────────
    @Nested
    @DisplayName("toDTOLight(Domaine)")
    class ToDTOLightDomaine {

        @Test
        @DisplayName("mappe les champs scalaires sans la liste des compétences")
        void shouldMapFieldsWithoutCompetences() {
            Domaine domaine = buildDomaine();
            domaine.setCompetences(List.of(buildCompetence(domaine)));

            DomaineDTO dto = CompetenceMapper.toDTOLight(domaine);

            assertThat(dto.getId()).isEqualTo(1L);
            assertThat(dto.getCode()).isEqualTo("GC-TECH");
            // Light version ne contient pas de compétences imbriquées
            assertThat(dto.getCompetences()).isNullOrEmpty();
        }
    }

    // ── toDTO(Competence) ─────────────────────────────────────────────────────
    @Nested
    @DisplayName("toDTO(Competence)")
    class ToDTOCompetence {

        @Test
        @DisplayName("mappe tous les champs scalaires et la référence au domaine")
        void shouldMapAllFields() {
            Domaine domaine = buildDomaine();
            Competence c = buildCompetence(domaine);

            CompetenceDTO dto = CompetenceMapper.toDTO(c);

            assertThat(dto.getId()).isEqualTo(2L);
            assertThat(dto.getCode()).isEqualTo("GC-C1");
            assertThat(dto.getNom()).isEqualTo("Compétences Sols");
            assertThat(dto.getOrdre()).isEqualTo(1);
            assertThat(dto.getDomaineId()).isEqualTo(1L);
            assertThat(dto.getDomaineNom()).isEqualTo("Technique Génie Civil");
        }

        @Test
        @DisplayName("mappe les sous-compétences imbriquées")
        void shouldMapNestedSousCompetences() {
            Domaine domaine = buildDomaine();
            Competence c = buildCompetence(domaine);
            SousCompetence sc = buildSousCompetence(c);
            c.setSousCompetences(List.of(sc));

            CompetenceDTO dto = CompetenceMapper.toDTO(c);

            assertThat(dto.getSousCompetences()).hasSize(1);
            assertThat(dto.getSousCompetences().get(0).getCode()).isEqualTo("SC-01");
        }
    }

    // ── toDTO(SousCompetence) ─────────────────────────────────────────────────
    @Nested
    @DisplayName("toDTO(SousCompetence)")
    class ToDTOSousCompetence {

        @Test
        @DisplayName("mappe les champs et la référence à la compétence")
        void shouldMapAllFields() {
            Domaine domaine = buildDomaine();
            Competence c = buildCompetence(domaine);
            SousCompetence sc = buildSousCompetence(c);

            SousCompetenceDTO dto = CompetenceMapper.toDTO(sc);

            assertThat(dto.getId()).isEqualTo(3L);
            assertThat(dto.getCode()).isEqualTo("SC-01");
            assertThat(dto.getCompetenceId()).isEqualTo(2L);
            assertThat(dto.getCompetenceNom()).isEqualTo("Compétences Sols");
        }

        @Test
        @DisplayName("mappe les savoirs imbriqués")
        void shouldMapNestedSavoirs() {
            Domaine d = buildDomaine();
            Competence c = buildCompetence(d);
            SousCompetence sc = buildSousCompetence(c);
            Savoir s = buildSavoir(sc);
            sc.setSavoirs(List.of(s));

            SousCompetenceDTO dto = CompetenceMapper.toDTO(sc);

            assertThat(dto.getSavoirs()).hasSize(1);
            assertThat(dto.getSavoirs().get(0).getCode()).isEqualTo("S2a");
        }
    }

    // ── toDTO(Savoir) ─────────────────────────────────────────────────────────
    @Nested
    @DisplayName("toDTO(Savoir)")
    class ToDTOSavoir {

        @Test
        @DisplayName("mappe tous les champs scalaires")
        void shouldMapAllFields() {
            Domaine d = buildDomaine();
            Competence c = buildCompetence(d);
            SousCompetence sc = buildSousCompetence(c);
            Savoir s = buildSavoir(sc);

            SavoirDTO dto = CompetenceMapper.toDTO(s);

            assertThat(dto.getId()).isEqualTo(4L);
            assertThat(dto.getCode()).isEqualTo("S2a");
            assertThat(dto.getNom()).isEqualTo("Essai de classification");
            assertThat(dto.getType()).isEqualTo(TypeSavoir.PRATIQUE);
            assertThat(dto.getNiveau()).isEqualTo(NiveauMaitrise.N1_DEBUTANT);
            assertThat(dto.getSousCompetenceId()).isEqualTo(3L);
            assertThat(dto.getSousCompetenceNom()).isEqualTo("Essais géotechniques");
        }
    }

    // ── toDTO(EnseignantCompetence) ───────────────────────────────────────────
    @Nested
    @DisplayName("toDTO(EnseignantCompetence)")
    class ToDTOEnseignantCompetence {

        @Test
        @DisplayName("mappe tous les champs et remonte la chaîne SousCompétence→Compétence→Domaine")
        void shouldMapFullChain() {
            Domaine d = buildDomaine();
            Competence c = buildCompetence(d);
            SousCompetence sc = buildSousCompetence(c);
            Savoir s = buildSavoir(sc);

            EnseignantCompetence ec = EnseignantCompetence.builder()
                    .id(10L).enseignantId("ens-001").savoir(s)
                    .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                    .dateAcquisition(LocalDate.of(2025, 6, 1))
                    .commentaire("Bon niveau")
                    .build();

            EnseignantCompetenceDTO dto = CompetenceMapper.toDTO(ec);

            assertThat(dto.getId()).isEqualTo(10L);
            assertThat(dto.getEnseignantId()).isEqualTo("ens-001");
            assertThat(dto.getSavoirId()).isEqualTo(4L);
            assertThat(dto.getSavoirCode()).isEqualTo("S2a");
            assertThat(dto.getSavoirNom()).isEqualTo("Essai de classification");
            assertThat(dto.getSousCompetenceNom()).isEqualTo("Essais géotechniques");
            assertThat(dto.getCompetenceNom()).isEqualTo("Compétences Sols");
            assertThat(dto.getDomaineNom()).isEqualTo("Technique Génie Civil");
            assertThat(dto.getNiveau()).isEqualTo(NiveauMaitrise.N2_ELEMENTAIRE);
            assertThat(dto.getCommentaire()).isEqualTo("Bon niveau");
        }
    }
}
