package tn.esprit.d2f.competence.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CompetencePrerequisiteDTO - Tests")
class CompetencePrerequisiteDTOTest {

    @Test
    @DisplayName("Constructeur a 9 arguments (projection JPQL) - doit mapper tous les champs")
    void nineArgConstructor_ShouldMapAllFields() {
        LocalDateTime now = LocalDateTime.now();

        CompetencePrerequisiteDTO dto = new CompetencePrerequisiteDTO(
                1L,
                10L,
                "Mecanique des sols",
                20L,
                "Essai Proctor",
                "EP-001",
                NiveauMaitrise.N3_INTERMEDIAIRE,
                "Description du prerequis",
                now
        );

        assertThat(dto)
                .returns(1L, CompetencePrerequisiteDTO::getId)
                .returns(10L, CompetencePrerequisiteDTO::getCompetenceId)
                .returns("Mecanique des sols", CompetencePrerequisiteDTO::getCompetenceNom)
                .returns(20L, CompetencePrerequisiteDTO::getPrerequisiteId)
                .returns("Essai Proctor", CompetencePrerequisiteDTO::getPrerequisiteNom)
                .returns("EP-001", CompetencePrerequisiteDTO::getPrerequisiteCode)
                .returns(NiveauMaitrise.N3_INTERMEDIAIRE, CompetencePrerequisiteDTO::getNiveauMinimum)
                .returns("Description du prerequis", CompetencePrerequisiteDTO::getDescription)
                .returns(now, CompetencePrerequisiteDTO::getCreatedAt);
    }

    @Test
    @DisplayName("Builder - doit construire un DTO complet")
    void builder_ShouldBuildCompleteDTO() {
        LocalDateTime now = LocalDateTime.now();

        CompetencePrerequisiteDTO dto = CompetencePrerequisiteDTO.builder()
                .id(2L)
                .competenceId(11L)
                .competenceNom("Resistance des materiaux")
                .prerequisiteId(21L)
                .prerequisiteNom("Traction simple")
                .prerequisiteCode("TS-001")
                .niveauMinimum(NiveauMaitrise.N4_AVANCE)
                .niveauMinimumLabel("Avance")
                .description("Prerequis avance")
                .createdAt(now)
                .build();

        assertThat(dto)
                .returns(2L, CompetencePrerequisiteDTO::getId)
                .returns(11L, CompetencePrerequisiteDTO::getCompetenceId)
                .returns("Resistance des materiaux", CompetencePrerequisiteDTO::getCompetenceNom)
                .returns(21L, CompetencePrerequisiteDTO::getPrerequisiteId)
                .returns("Traction simple", CompetencePrerequisiteDTO::getPrerequisiteNom)
                .returns("TS-001", CompetencePrerequisiteDTO::getPrerequisiteCode)
                .returns(NiveauMaitrise.N4_AVANCE, CompetencePrerequisiteDTO::getNiveauMinimum)
                .returns("Avance", CompetencePrerequisiteDTO::getNiveauMinimumLabel)
                .returns("Prerequis avance", CompetencePrerequisiteDTO::getDescription)
                .returns(now, CompetencePrerequisiteDTO::getCreatedAt);
    }

    @Test
    @DisplayName("No-args + setters - doit permettre la creation par defaut")
    void noArgsAndSetters_ShouldWork() {
        CompetencePrerequisiteDTO dto = new CompetencePrerequisiteDTO();
        dto.setId(3L);
        dto.setCompetenceId(12L);
        dto.setCompetenceNom("Hydraulique");
        dto.setPrerequisiteId(22L);
        dto.setPrerequisiteNom("Ecoulement");
        dto.setPrerequisiteCode("EC-001");
        dto.setNiveauMinimum(NiveauMaitrise.N2_ELEMENTAIRE);
        dto.setNiveauMinimumLabel("Elementaire");
        dto.setDescription("Prerequis elementaire");

        assertThat(dto)
                .returns(3L, CompetencePrerequisiteDTO::getId)
                .returns(12L, CompetencePrerequisiteDTO::getCompetenceId)
                .returns("Hydraulique", CompetencePrerequisiteDTO::getCompetenceNom)
                .returns(22L, CompetencePrerequisiteDTO::getPrerequisiteId)
                .returns(NiveauMaitrise.N2_ELEMENTAIRE, CompetencePrerequisiteDTO::getNiveauMinimum);
    }

    @Test
    @DisplayName("All-args constructor - doit mapper tous les champs y compris niveauMinimumLabel")
    void allArgsConstructor_ShouldMapAllFields() {
        LocalDateTime now = LocalDateTime.now();

        CompetencePrerequisiteDTO dto = new CompetencePrerequisiteDTO(
                4L, 13L, "Beton", 23L, "Ciment", "CI-001",
                NiveauMaitrise.N5_EXPERT, "Expert", "Prerequis expert", now
        );

        assertThat(dto)
                .returns(4L, CompetencePrerequisiteDTO::getId)
                .returns("Expert", CompetencePrerequisiteDTO::getNiveauMinimumLabel);
    }

    @Test
    @DisplayName("Equals & HashCode - deux DTOs avec le meme id doivent etre egaux")
    void equalsAndHashCode_ShouldWorkForSameId() {
        CompetencePrerequisiteDTO dto1 = CompetencePrerequisiteDTO.builder().id(1L).build();
        CompetencePrerequisiteDTO dto2 = CompetencePrerequisiteDTO.builder().id(1L).build();

        assertThat(dto1)
                .isEqualTo(dto2)
                .hasSameHashCodeAs(dto2);
    }

    @Test
    @DisplayName("ToString - doit contenir les champs principaux")
    void toString_ShouldContainMainFields() {
        CompetencePrerequisiteDTO dto = CompetencePrerequisiteDTO.builder()
                .id(1L)
                .competenceNom("Test Competence")
                .build();

        String str = dto.toString();
        assertThat(str).contains("Test Competence");
    }
}
