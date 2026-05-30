package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DisplayName("FormationMapper - Tests unitaires")
class FormationMapperTest {

    private final FormationMapper mapper = new FormationMapper();

    @Nested
    @DisplayName("toEntity()")
    class ToEntity {

        @Test
        @DisplayName("retourne null pour request null")
        void shouldReturnNullWhenNull() {
            assertThat(mapper.toEntity(null)).isNull();
        }

        @Test
        @DisplayName("mappe les champs de base et dates")
        void shouldMapBasicFields() {
            CreateFormationRequest request = CreateFormationRequest.builder()
                    .titreFormation("Formation Test")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .dateDebut(LocalDate.of(2026, 6, 1))
                    .dateFin(LocalDate.of(2026, 6, 10))
                    .chargeHoraireGlobal(40)
                    .objectifs("Objectifs")
                    .objectifsPedago("Peda")
                    .evalMethods("Eval")
                    .coutFormation(1000f)
                    .coutTransport(200f)
                    .coutHebergement(500f)
                    .coutRepas(300f)
                    .build();

            Formation result = mapper.toEntity(request);

            assertThat(result.getTitreFormation()).isEqualTo("Formation Test");
            assertThat(result.getTypeFormation()).isEqualTo(TypeFormation.INTERNE);
            assertThat(result.getEtatFormation()).isEqualTo(EtatFormation.PLANIFIE);
            assertThat(result.getDateDebut()).isEqualTo(java.sql.Date.valueOf(LocalDate.of(2026, 6, 1)));
            assertThat(result.getDateFin()).isEqualTo(java.sql.Date.valueOf(LocalDate.of(2026, 6, 10)));
            assertThat(result.getChargeHoraireGlobal()).isEqualTo(40);
            assertThat(result.getObjectifs()).isEqualTo("Objectifs");
            assertThat(result.getObjectifsPedago()).isEqualTo("Peda");
            assertThat(result.getEvalMethods()).isEqualTo("Eval");
            assertThat(result.getCoutFormation()).isEqualTo(1000f);
            assertThat(result.getCoutTransport()).isEqualTo(200f);
            assertThat(result.getCoutHebergement()).isEqualTo(500f);
            assertThat(result.getCoutRepas()).isEqualTo(300f);
        }

        @Test
        @DisplayName("mappe les champs descriptifs et formateur")
        void shouldMapDescriptionFields() {
            CreateFormationRequest request = CreateFormationRequest.builder()
                    .titreFormation("Formation Test")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .dateDebut(LocalDate.of(2026, 6, 1))
                    .dateFin(LocalDate.of(2026, 6, 10))
                    .domaine("IT")
                    .competence("Java")
                    .populationCible("Engineers")
                    .prerequis("Basics")
                    .acquis("Advanced")
                    .indicateurs("KPIs")
                    .externeFormateurNom("Doe")
                    .externeFormateurPrenom("John")
                    .externeFormateurEmail("john@test.com")
                    .organismeRefExterne("Org")
                    .bureauFormationNom("Bureau")
                    .bureauFormationMail("bureau@test.com")
                    .bureauFormationTelephone("123")
                    .salle("Salle A")
                    .periodCode("P1")
                    .customPeriodLabel("Période 1")
                    .build();

            Formation result = mapper.toEntity(request);

            assertThat(result.getDomaine()).isEqualTo("IT");
            assertThat(result.getCompetence()).isEqualTo("Java");
            assertThat(result.getPopulationCible()).isEqualTo("Engineers");
            assertThat(result.getPrerequis()).isEqualTo("Basics");
            assertThat(result.getAcquis()).isEqualTo("Advanced");
            assertThat(result.getIndicateurs()).isEqualTo("KPIs");
            assertThat(result.getExterneFormateurNom()).isEqualTo("Doe");
            assertThat(result.getExterneFormateurPrenom()).isEqualTo("John");
            assertThat(result.getExterneFormateurEmail()).isEqualTo("john@test.com");
            assertThat(result.getOrganismeRefExterne()).isEqualTo("Org");
            assertThat(result.getBureauFormationNom()).isEqualTo("Bureau");
            assertThat(result.getBureauFormationMail()).isEqualTo("bureau@test.com");
            assertThat(result.getBureauFormationTelephone()).isEqualTo("123");
            assertThat(result.getSalle()).isEqualTo("Salle A");
            assertThat(result.getPeriodCode()).isEqualTo(PeriodCode.P1);
            assertThat(result.getCustomPeriodLabel()).isEqualTo("Période 1");
        }

        @Test
        @DisplayName("laisse typeFormation null si request typeFormation est null")
        void shouldLeaveTypeNullWhenNull() {
            CreateFormationRequest request = CreateFormationRequest.builder()
                    .titreFormation("Test")
                    .dateDebut(LocalDate.now())
                    .dateFin(LocalDate.now().plusDays(1))
                    .typeFormation(null)
                    .etatFormation("PLANIFIE")
                    .build();

            Formation result = mapper.toEntity(request);
            assertThat(result.getTypeFormation()).isNull();
        }

        @Test
        @DisplayName("mappe typeFormation EXTERNE")
        void shouldMapExterneType() {
            CreateFormationRequest request = CreateFormationRequest.builder()
                    .titreFormation("Test")
                    .dateDebut(LocalDate.now())
                    .dateFin(LocalDate.now().plusDays(1))
                    .typeFormation("EXTERNE")
                    .etatFormation("EN_COURS")
                    .build();

            Formation result = mapper.toEntity(request);
            assertThat(result.getTypeFormation()).isEqualTo(TypeFormation.EXTERNE);
            assertThat(result.getEtatFormation()).isEqualTo(EtatFormation.EN_COURS);
        }

        @Test
        @DisplayName("mappe etatFormation null")
        void shouldHandleNullEtat() {
            CreateFormationRequest request = CreateFormationRequest.builder()
                    .titreFormation("Test")
                    .dateDebut(LocalDate.now())
                    .dateFin(LocalDate.now().plusDays(1))
                    .typeFormation("INTERNE")
                    .etatFormation(null)
                    .build();

            Formation result = mapper.toEntity(request);
            assertThat(result.getEtatFormation()).isNull();
        }

        @Test
        @DisplayName("mappe periodCode null")
        void shouldHandleNullPeriodCode() {
            CreateFormationRequest request = CreateFormationRequest.builder()
                    .titreFormation("Test")
                    .dateDebut(LocalDate.now())
                    .dateFin(LocalDate.now().plusDays(1))
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .periodCode(null)
                    .build();

            Formation result = mapper.toEntity(request);
            assertThat(result.getPeriodCode()).isNull();
        }

        @Test
        @DisplayName("mappe avec dates null")
        void shouldHandleNullDates() {
            CreateFormationRequest request = CreateFormationRequest.builder()
                    .titreFormation("Test")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .build();

            Formation result = mapper.toEntity(request);
            assertThat(result.getDateDebut()).isNull();
            assertThat(result.getDateFin()).isNull();
        }
    }

    @Nested
    @DisplayName("updateEntityFromRequest()")
    class UpdateEntity {

        @Test
        @DisplayName("retourne silencieusement si request null")
        void shouldReturnWhenNullRequest() {
            Formation f = new Formation();
            mapper.updateEntityFromRequest(null, f);
            assertThat(f.getTitreFormation()).isNull();
        }

        @Test
        @DisplayName("retourne silencieusement si entity null")
        void shouldReturnWhenNullEntity() {
            UpdateFormationRequest req = new UpdateFormationRequest();
            req.setTitreFormation("test");
            mapper.updateEntityFromRequest(req, null);
            assertThat(req.getTitreFormation()).isEqualTo("test");
        }

        @Test
        @DisplayName("met à jour tous les champs non null")
        void shouldUpdateAllNonNullFields() {
            Formation f = new Formation();
            UpdateFormationRequest request = new UpdateFormationRequest();
            request.setTitreFormation("Updated Title");
            request.setTypeFormation("EXTERNE");
            request.setEtatFormation("EN_COURS");
            request.setDateDebut(LocalDate.of(2026, 7, 1));
            request.setDateFin(LocalDate.of(2026, 7, 10));
            request.setChargeHoraireGlobal(50);
            request.setObjectifs("New objectives");
            request.setObjectifsPedago("New peda");
            request.setEvalMethods("New eval");
            request.setCoutFormation(2000f);
            request.setCoutTransport(400f);
            request.setCoutHebergement(600f);
            request.setCoutRepas(200f);
            request.setDomaine("New domain");
            request.setCompetence("New comp");
            request.setPopulationCible("New target");
            request.setPrerequis("New prereq");
            request.setAcquis("New acquis");
            request.setIndicateurs("New ind");
            request.setExterneFormateurNom("New nom");
            request.setExterneFormateurPrenom("New prenom");
            request.setExterneFormateurEmail("new@test.com");
            request.setOrganismeRefExterne("New org");
            request.setBureauFormationNom("New bureau");
            request.setBureauFormationMail("new@bureau.com");
            request.setBureauFormationTelephone("456");
            request.setSalle("Salle B");
            request.setPeriodCode("P2");
            request.setCustomPeriodLabel("Période 2");

            mapper.updateEntityFromRequest(request, f);

            assertThat(f.getTitreFormation()).isEqualTo("Updated Title");
            assertThat(f.getTypeFormation()).isEqualTo(TypeFormation.EXTERNE);
            assertThat(f.getEtatFormation()).isEqualTo(EtatFormation.EN_COURS);
            assertThat(f.getDateDebut()).isEqualTo(java.sql.Date.valueOf(LocalDate.of(2026, 7, 1)));
            assertThat(f.getDateFin()).isEqualTo(java.sql.Date.valueOf(LocalDate.of(2026, 7, 10)));
            assertThat(f.getChargeHoraireGlobal()).isEqualTo(50);
            assertThat(f.getCoutFormation()).isEqualTo(2000f);
            assertThat(f.getDomaine()).isEqualTo("New domain");
            assertThat(f.getCompetence()).isEqualTo("New comp");
            assertThat(f.getSalle()).isEqualTo("Salle B");
            assertThat(f.getPeriodCode()).isEqualTo(PeriodCode.P2);
            assertThat(f.getCustomPeriodLabel()).isEqualTo("Période 2");
        }

        @Test
        @DisplayName("ne modifie que les champs fournis")
        void shouldOnlyUpdateProvidedFields() {
            Formation f = new Formation();
            f.setTitreFormation("Original");

            UpdateFormationRequest request = new UpdateFormationRequest();
            request.setTitreFormation("Modified");

            mapper.updateEntityFromRequest(request, f);

            assertThat(f.getTitreFormation()).isEqualTo("Modified");
            assertThat(f.getTypeFormation()).isNull();
            assertThat(f.getDateDebut()).isNull();
        }
    }

    @Nested
    @DisplayName("toResponseDTO()")
    class ToResponseDTO {

        @Test
        @DisplayName("retourne null pour formation null")
        void shouldReturnNullWhenNull() {
            assertThat(mapper.toResponseDTO(null)).isNull();
        }

        @Test
        @DisplayName("mappe tous les champs simples")
        void shouldMapAllSimpleFields() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setTitreFormation("Test");
            f.setTypeFormation(TypeFormation.INTERNE);
            f.setEtatFormation(EtatFormation.PLANIFIE);
            f.setDateDebut(new Date());
            f.setDateFin(new Date());
            f.setChargeHoraireGlobal(40);
            f.setObjectifs("Obj");
            f.setObjectifsPedago("Peda");
            f.setEvalMethods("Eval");
            f.setCoutFormation(500f);
            f.setCoutTransport(100f);
            f.setCoutHebergement(200f);
            f.setCoutRepas(150f);
            f.setDomaine("IT");
            f.setCompetence("Java");
            f.setPopulationCible("Devs");
            f.setPrerequis("Pre");
            f.setAcquis("Post");
            f.setIndicateurs("KPI");
            f.setExterneFormateurNom("Doe");
            f.setExterneFormateurPrenom("John");
            f.setExterneFormateurEmail("john@test.com");
            f.setOrganismeRefExterne("Org");
            f.setBureauFormationNom("Bureau");
            f.setBureauFormationMail("b@b.com");
            f.setBureauFormationTelephone("789");
            f.setSalle("Salle C");
            f.setPeriodCode(PeriodCode.P1);
            f.setCustomPeriodLabel("P1");
            f.setOuverte(true);
            f.setInscriptionsOuvertes(false);
            f.setCertifGenerated(true);

            FormationResponseDTO dto = mapper.toResponseDTO(f);

            assertThat(dto.getIdFormation()).isEqualTo(1L);
            assertThat(dto.getTitreFormation()).isEqualTo("Test");
            assertThat(dto.getTypeFormation()).isEqualTo("INTERNE");
            assertThat(dto.getEtatFormation()).isEqualTo("PLANIFIE");
            assertThat(dto.getChargeHoraireGlobal()).isEqualTo(40);
            assertThat(dto.getObjectifs()).isEqualTo("Obj");
            assertThat(dto.getCoutFormation()).isEqualTo(500f);
            assertThat(dto.getDomaine()).isEqualTo("IT");
            assertThat(dto.getSalle()).isEqualTo("Salle C");
            assertThat(dto.getPeriodCode()).isEqualTo("P1");
            assertThat(dto.getCustomPeriodLabel()).isEqualTo("P1");
            assertThat(dto.isOuverte()).isTrue();
            assertThat(dto.isInscriptionsOuvertes()).isFalse();
            assertThat(dto.isCertifGenerated()).isTrue();
        }

        @Test
        @DisplayName("mappe avec relations null")
        void shouldMapWithNullRelations() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setTitreFormation("Test");
            f.setDateDebut(new Date());
            f.setDateFin(new Date());

            FormationResponseDTO dto = mapper.toResponseDTO(f);

            assertThat(dto.getUp()).isNull();
            assertThat(dto.getDepartement()).isNull();
            assertThat(dto.getSeances()).isNull();
            assertThat(dto.getTypeFormation()).isNull();
            assertThat(dto.getEtatFormation()).isNull();
            assertThat(dto.getPeriodCode()).isNull();
        }

        @Test
        @DisplayName("mappe avec relations")
        void shouldMapWithRelations() {
            Up up = new Up();
            up.setId("UP1");
            up.setLibelle("UP Test");

            Dept dept = new Dept();
            dept.setId("DEPT1");
            dept.setLibelle("Dept Test");

            SeanceFormation seance = new SeanceFormation();
            seance.setIdSeance(10L);
            seance.setSalle("Salle X");

            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setTitreFormation("Test");
            f.setDateDebut(new Date());
            f.setDateFin(new Date());
            f.setUp(up);
            f.setDepartement(dept);
            f.setSeances(List.of(seance));

            FormationResponseDTO dto = mapper.toResponseDTO(f);

            assertThat(dto.getUp()).isNotNull();
            assertThat(dto.getUp().getId()).isEqualTo("UP1");
            assertThat(dto.getUp().getLibelle()).isEqualTo("UP Test");

            assertThat(dto.getDepartement()).isNotNull();
            assertThat(dto.getDepartement().getId()).isEqualTo("DEPT1");
            assertThat(dto.getDepartement().getLibelle()).isEqualTo("Dept Test");

            assertThat(dto.getSeances()).hasSize(1);
            assertThat(dto.getSeances().get(0).getIdSeance()).isEqualTo(10L);
            assertThat(dto.getSeances().get(0).getSalle()).isEqualTo("Salle X");
        }

        @Test
        @DisplayName("mappe avec seances liste vide")
        void shouldMapWithEmptySeances() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setTitreFormation("Test");
            f.setDateDebut(new Date());
            f.setDateFin(new Date());
            f.setSeances(new ArrayList<>());

            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getSeances()).isEmpty();
        }
    }
}
