package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DisplayName("FormationMapper - Line Coverage Tests")
class FormationMapperLineCoverageTest {

    private final FormationMapper mapper = new FormationMapper();

    // ─────────────────────────────────────────────────────────────
    // toEntity
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("toEntity()")
    class ToEntity {

        @Test
        @DisplayName("returns null when request is null")
        void nullRequest() {
            assertThat(mapper.toEntity(null)).isNull();
        }

        @Test
        @DisplayName("maps INTERNE type via switch")
        void switchInterne() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .build();
            Formation f = mapper.toEntity(req);
            assertThat(f.getTypeFormation()).isEqualTo(TypeFormation.INTERNE);
        }

        @Test
        @DisplayName("maps EXTERNE type via switch")
        void switchExterne() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("EXTERNE")
                    .etatFormation("PLANIFIE")
                    .build();
            assertThat(mapper.toEntity(req).getTypeFormation()).isEqualTo(TypeFormation.EXTERNE);
        }

        @Test
        @DisplayName("maps unknown type to EN_LIGNE (default)")
        void switchDefault() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("MIXTE")
                    .etatFormation("PLANIFIE")
                    .build();
            assertThat(mapper.toEntity(req).getTypeFormation()).isEqualTo(TypeFormation.EN_LIGNE);
        }

        @Test
        @DisplayName("null typeFormation leaves entity type null")
        void nullType() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation(null)
                    .build();
            assertThat(mapper.toEntity(req).getTypeFormation()).isNull();
        }

        @Test
        @DisplayName("null etatFormation leaves entity etat null")
        void nullEtat() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("INTERNE")
                    .etatFormation(null)
                    .build();
            assertThat(mapper.toEntity(req).getEtatFormation()).isNull();
        }

        @Test
        @DisplayName("valid etatFormation maps correctly")
        void validEtat() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("INTERNE")
                    .etatFormation("EN_COURS")
                    .build();
            assertThat(mapper.toEntity(req).getEtatFormation()).isEqualTo(EtatFormation.EN_COURS);
        }

        @Test
        @DisplayName("null dates are not set on entity")
        void nullDates() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .dateDebut(null)
                    .dateFin(null)
                    .build();
            Formation f = mapper.toEntity(req);
            assertThat(f.getDateDebut()).isNull();
            assertThat(f.getDateFin()).isNull();
        }

        @Test
        @DisplayName("non-null dates are set on entity")
        void nonNullDates() {
            LocalDate d1 = LocalDate.of(2026, Month.JANUARY, 1);
            LocalDate d2 = LocalDate.of(2026, Month.JANUARY, 5);
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .dateDebut(d1)
                    .dateFin(d2)
                    .build();
            Formation f = mapper.toEntity(req);
            assertThat(f.getDateDebut()).isEqualTo(d1);
            assertThat(f.getDateFin()).isEqualTo(d2);
        }

        @Test
        @DisplayName("null periodCode leaves entity period null")
        void nullPeriodCode() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .periodCode(null)
                    .build();
            assertThat(mapper.toEntity(req).getPeriodCode()).isNull();
        }

        @Test
        @DisplayName("valid periodCode maps correctly")
        void validPeriodCode() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("T")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .periodCode("P1")
                    .build();
            assertThat(mapper.toEntity(req).getPeriodCode()).isEqualTo(PeriodCode.P1);
        }

        @Test
        @DisplayName("maps all scalar fields")
        void allScalarFields() {
            CreateFormationRequest req = CreateFormationRequest.builder()
                    .titreFormation("Formation A")
                    .typeFormation("INTERNE")
                    .etatFormation("PLANIFIE")
                    .chargeHoraireGlobal(20)
                    .objectifs("obj")
                    .objectifsPedago("peda")
                    .evalMethods("eval")
                    .coutFormation(1000f)
                    .coutTransport(100f)
                    .coutHebergement(200f)
                    .coutRepas(50f)
                    .domaine("IT")
                    .competence("Java")
                    .populationCible("Devs")
                    .prerequis("pre")
                    .acquis("acq")
                    .indicateurs("ind")
                    .externeFormateurNom("N")
                    .externeFormateurPrenom("P")
                    .externeFormateurEmail("e@e.com")
                    .organismeRefExterne("Org")
                    .bureauFormationNom("B")
                    .bureauFormationMail("b@b.com")
                    .bureauFormationTelephone("123")
                    .salle("Salle")
                    .customPeriodLabel("Label")
                    .build();
            Formation f = mapper.toEntity(req);
            assertThat(f.getTitreFormation()).isEqualTo("Formation A");
            assertThat(f.getChargeHoraireGlobal()).isEqualTo(20);
            assertThat(f.getObjectifs()).isEqualTo("obj");
            assertThat(f.getObjectifsPedago()).isEqualTo("peda");
            assertThat(f.getEvalMethods()).isEqualTo("eval");
            assertThat(f.getCoutFormation()).isEqualTo(1000f);
            assertThat(f.getCoutTransport()).isEqualTo(100f);
            assertThat(f.getCoutHebergement()).isEqualTo(200f);
            assertThat(f.getCoutRepas()).isEqualTo(50f);
            assertThat(f.getDomaine()).isEqualTo("IT");
            assertThat(f.getCompetence()).isEqualTo("Java");
            assertThat(f.getPopulationCible()).isEqualTo("Devs");
            assertThat(f.getPrerequis()).isEqualTo("pre");
            assertThat(f.getAcquis()).isEqualTo("acq");
            assertThat(f.getIndicateurs()).isEqualTo("ind");
            assertThat(f.getExterneFormateurNom()).isEqualTo("N");
            assertThat(f.getExterneFormateurPrenom()).isEqualTo("P");
            assertThat(f.getExterneFormateurEmail()).isEqualTo("e@e.com");
            assertThat(f.getOrganismeRefExterne()).isEqualTo("Org");
            assertThat(f.getBureauFormationNom()).isEqualTo("B");
            assertThat(f.getBureauFormationMail()).isEqualTo("b@b.com");
            assertThat(f.getBureauFormationTelephone()).isEqualTo("123");
            assertThat(f.getSalle()).isEqualTo("Salle");
            assertThat(f.getCustomPeriodLabel()).isEqualTo("Label");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // updateEntityFromRequest
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("updateEntityFromRequest()")
    class UpdateEntity {

        @Test
        @DisplayName("returns early when request is null")
        void nullRequest() {
            Formation f = new Formation();
            f.setTitreFormation("keep");
            mapper.updateEntityFromRequest(null, f);
            assertThat(f.getTitreFormation()).isEqualTo("keep");
        }

        @Test
        @DisplayName("returns early when entity is null")
        void nullEntity() {
            UpdateFormationRequest req = new UpdateFormationRequest();
            req.setTitreFormation("test");
            mapper.updateEntityFromRequest(req, null);
            assertThat(req.getTitreFormation()).isEqualTo("test");
        }

        @Test
        @DisplayName("updates all non-null fields individually - core fields")
        void updateAllFields_coreFields() {
            Formation f = new Formation();
            UpdateFormationRequest req = new UpdateFormationRequest();
            req.setTitreFormation("T");
            req.setTypeFormation("EXTERNE");
            req.setEtatFormation("EN_COURS");
            LocalDate d1 = LocalDate.of(2026, Month.FEBRUARY, 1);
            LocalDate d2 = LocalDate.of(2026, Month.FEBRUARY, 5);
            req.setDateDebut(d1);
            req.setDateFin(d2);
            req.setChargeHoraireGlobal(10);
            req.setObjectifs("o");
            req.setObjectifsPedago("op");
            req.setEvalMethods("em");
            req.setCoutFormation(100f);
            req.setCoutTransport(20f);
            req.setCoutHebergement(30f);
            req.setCoutRepas(10f);
            req.setDomaine("D");
            req.setCompetence("C");
            req.setPopulationCible("P");
            req.setPrerequis("Pr");
            req.setAcquis("A");
            req.setIndicateurs("I");

            mapper.updateEntityFromRequest(req, f);

            assertThat(f.getTitreFormation()).isEqualTo("T");
            assertThat(f.getTypeFormation()).isEqualTo(TypeFormation.EXTERNE);
            assertThat(f.getEtatFormation()).isEqualTo(EtatFormation.EN_COURS);
            assertThat(f.getDateDebut()).isEqualTo(d1);
            assertThat(f.getDateFin()).isEqualTo(d2);
            assertThat(f.getChargeHoraireGlobal()).isEqualTo(10);
            assertThat(f.getObjectifs()).isEqualTo("o");
            assertThat(f.getObjectifsPedago()).isEqualTo("op");
            assertThat(f.getEvalMethods()).isEqualTo("em");
            assertThat(f.getCoutFormation()).isEqualTo(100f);
            assertThat(f.getCoutTransport()).isEqualTo(20f);
            assertThat(f.getCoutHebergement()).isEqualTo(30f);
            assertThat(f.getCoutRepas()).isEqualTo(10f);
            assertThat(f.getDomaine()).isEqualTo("D");
            assertThat(f.getCompetence()).isEqualTo("C");
            assertThat(f.getPopulationCible()).isEqualTo("P");
            assertThat(f.getPrerequis()).isEqualTo("Pr");
            assertThat(f.getAcquis()).isEqualTo("A");
            assertThat(f.getIndicateurs()).isEqualTo("I");
        }

        @Test
        @DisplayName("updates all non-null fields individually - external/bureau fields")
        void updateAllFields_externalFields() {
            Formation f = new Formation();
            UpdateFormationRequest req = new UpdateFormationRequest();
            req.setExterneFormateurNom("N");
            req.setExterneFormateurPrenom("Pn");
            req.setExterneFormateurEmail("e@e.com");
            req.setOrganismeRefExterne("O");
            req.setBureauFormationNom("B");
            req.setBureauFormationMail("b@b.com");
            req.setBureauFormationTelephone("123");
            req.setSalle("S");
            req.setPeriodCode("P1");
            req.setCustomPeriodLabel("L");

            mapper.updateEntityFromRequest(req, f);

            assertThat(f.getExterneFormateurNom()).isEqualTo("N");
            assertThat(f.getExterneFormateurPrenom()).isEqualTo("Pn");
            assertThat(f.getExterneFormateurEmail()).isEqualTo("e@e.com");
            assertThat(f.getOrganismeRefExterne()).isEqualTo("O");
            assertThat(f.getBureauFormationNom()).isEqualTo("B");
            assertThat(f.getBureauFormationMail()).isEqualTo("b@b.com");
            assertThat(f.getBureauFormationTelephone()).isEqualTo("123");
            assertThat(f.getSalle()).isEqualTo("S");
            assertThat(f.getPeriodCode()).isEqualTo(PeriodCode.P1);
            assertThat(f.getCustomPeriodLabel()).isEqualTo("L");
        }

        @Test
        @DisplayName("updates all non-null fields individually - additional fields")
        void updateAllFields_additionalFields() {
            Formation f = new Formation();
            UpdateFormationRequest req = new UpdateFormationRequest();
            req.setTitreFormation("T");
            req.setTypeFormation("EXTERNE");
            req.setEtatFormation("EN_COURS");
            req.setBureauFormationMail("b@b.com");
            req.setBureauFormationTelephone("123");
            req.setSalle("S");
            req.setPeriodCode("P1");
            req.setCustomPeriodLabel("L");

            mapper.updateEntityFromRequest(req, f);

            assertThat(f.getBureauFormationMail()).isEqualTo("b@b.com");
            assertThat(f.getBureauFormationTelephone()).isEqualTo("123");
            assertThat(f.getSalle()).isEqualTo("S");
            assertThat(f.getPeriodCode()).isEqualTo(PeriodCode.P1);
            assertThat(f.getCustomPeriodLabel()).isEqualTo("L");
        }

        @Test
        @DisplayName("null fields are skipped, existing values preserved")
        void nullFieldsSkipped() {
            Formation f = new Formation();
            f.setTitreFormation("Old");
            f.setSalle("Salle Old");
            UpdateFormationRequest req = new UpdateFormationRequest();
            mapper.updateEntityFromRequest(req, f);
            assertThat(f.getTitreFormation()).isEqualTo("Old");
            assertThat(f.getSalle()).isEqualTo("Salle Old");
        }

        @Test
        @DisplayName("only non-null fields are updated")
        void partialUpdate() {
            Formation f = new Formation();
            f.setTitreFormation("Old");
            f.setSalle("Salle Old");
            UpdateFormationRequest req = new UpdateFormationRequest();
            req.setSalle("Salle New");
            mapper.updateEntityFromRequest(req, f);
            assertThat(f.getTitreFormation()).isEqualTo("Old");
            assertThat(f.getSalle()).isEqualTo("Salle New");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // toResponseDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("toResponseDTO()")
    class ToResponseDTO {

        @Test
        @DisplayName("returns null for null formation")
        void nullFormation() {
            assertThat(mapper.toResponseDTO(null)).isNull();
        }

        @Test
        @DisplayName("null enums → null in DTO")
        void nullEnums() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getTypeFormation()).isNull();
            assertThat(dto.getEtatFormation()).isNull();
            assertThat(dto.getPeriodCode()).isNull();
        }

        @Test
        @DisplayName("maps all scalar fields - identifiers/types/dates")
        void scalarFields_identityAndDates() {
            Formation f = new Formation();
            f.setIdFormation(42L);
            f.setTitreFormation("T");
            f.setTypeFormation(TypeFormation.EXTERNE);
            f.setEtatFormation(EtatFormation.EN_COURS);
            LocalDate d1 = LocalDate.of(2026, Month.MARCH, 1);
            LocalDate d2 = LocalDate.of(2026, Month.MARCH, 5);
            f.setDateDebut(d1);
            f.setDateFin(d2);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getIdFormation()).isEqualTo(42L);
            assertThat(dto.getTitreFormation()).isEqualTo("T");
            assertThat(dto.getTypeFormation()).isEqualTo("EXTERNE");
            assertThat(dto.getEtatFormation()).isEqualTo("EN_COURS");
            assertThat(dto.getDateDebut()).isEqualTo(d1);
            assertThat(dto.getDateFin()).isEqualTo(d2);
        }

        @Test
        @DisplayName("maps all scalar fields - costs/charge/objectives")
        void scalarFields_costsAndContent() {
            Formation f = new Formation();
            f.setChargeHoraireGlobal(30);
            f.setObjectifs("o");
            f.setObjectifsPedago("op");
            f.setEvalMethods("em");
            f.setCoutFormation(500f);
            f.setCoutTransport(50f);
            f.setCoutHebergement(100f);
            f.setCoutRepas(25f);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getChargeHoraireGlobal()).isEqualTo(30);
            assertThat(dto.getObjectifs()).isEqualTo("o");
            assertThat(dto.getEvalMethods()).isEqualTo("em");
            assertThat(dto.getCoutFormation()).isEqualTo(500f);
        }

        @Test
        @DisplayName("maps all scalar fields - metadata/audit/responsable")
        void scalarFields_metadataAndAudit() {
            Formation f = new Formation();
            f.setDomaine("D");
            f.setSalle("S");
            f.setPeriodCode(PeriodCode.P2);
            f.setCustomPeriodLabel("L");
            f.setOuverte(true);
            f.setInscriptionsOuvertes(false);
            f.setCertifGenerated(true);
            f.setResponsableEmail("resp@r.com");
            f.setResponsableName("Resp Name");
            LocalDateTime now = LocalDateTime.now();
            f.setCreatedAt(now);
            f.setUpdatedAt(now);
            f.setCreatedBy("admin");
            f.setUpdatedBy("admin2");
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getDomaine()).isEqualTo("D");
            assertThat(dto.getSalle()).isEqualTo("S");
            assertThat(dto.getPeriodCode()).isEqualTo("P2");
            assertThat(dto.getCustomPeriodLabel()).isEqualTo("L");
            assertThat(dto.isOuverte()).isTrue();
            assertThat(dto.isInscriptionsOuvertes()).isFalse();
            assertThat(dto.isCertifGenerated()).isTrue();
            assertThat(dto.getResponsableEmail()).isEqualTo("resp@r.com");
            assertThat(dto.getResponsableName()).isEqualTo("Resp Name");
            assertThat(dto.getCreatedAt()).isEqualTo(now);
            assertThat(dto.getUpdatedAt()).isEqualTo(now);
            assertThat(dto.getCreatedBy()).isEqualTo("admin");
            assertThat(dto.getUpdatedBy()).isEqualTo("admin2");
        }

        @Test
        @DisplayName("null UP/dept/seances → null in DTO")
        void nullRelations() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getUp()).isNull();
            assertThat(dto.getDepartement()).isNull();
            assertThat(dto.getSeances()).isNull();
        }

        @Test
        @DisplayName("maps UP relation")
        void withUp() {
            Up up = new Up();
            up.setId("U1");
            up.setLibelle("UP1");
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setUp(up);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getUp()).isNotNull();
            assertThat(dto.getUp().getId()).isEqualTo("U1");
            assertThat(dto.getUp().getLibelle()).isEqualTo("UP1");
        }

        @Test
        @DisplayName("maps Dept relation")
        void withDept() {
            Dept dept = new Dept();
            dept.setId("D1");
            dept.setLibelle("Dept1");
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setDepartement(dept);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getDepartement()).isNotNull();
            assertThat(dto.getDepartement().getId()).isEqualTo("D1");
            assertThat(dto.getDepartement().getLibelle()).isEqualTo("Dept1");
        }

        @Test
        @DisplayName("maps seance with all fields")
        void withSeanceFull_seanceFields() {
            Enseignant e1 = new Enseignant();
            e1.setId("E1");
            e1.setNom("Nom");
            e1.setPrenom("Prenom");
            e1.setMail("e@e.com");
            e1.setType("A");
            e1.setEtat("A");
            e1.setCup("C");
            e1.setChefDepartement("N");
            e1.setGrade("Prof");
            e1.setTelephone("123");
            e1.setPhotoUrl("url");
            e1.setUserId("U1");
            Up eUp = new Up();
            eUp.setId("U1");
            eUp.setLibelle("UP");
            e1.setUp(eUp);
            Dept eDept = new Dept();
            eDept.setId("D1");
            eDept.setLibelle("Dept");
            e1.setDept(eDept);

            SeanceFormation seance = new SeanceFormation();
            seance.setIdSeance(10L);
            seance.setDateSeance(LocalDate.of(2026, Month.APRIL, 1));
            seance.setHeureDebut(LocalTime.of(9, 0));
            seance.setHeureFin(LocalTime.of(12, 0));
            seance.setSalle("S1");
            seance.setTypeSeance(TypeSeanceEnum.THEORIQUE);
            seance.setContenus("contenu");
            seance.setMethodes("methode");
            seance.setDureeTheorique(2f);
            seance.setDureePratique(1f);
            seance.setOnlineMeetingUrl("https://teams.url");
            seance.setAnimateurs(new ArrayList<>(List.of(e1)));
            seance.setParticipants(new ArrayList<>(List.of(e1)));

            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setSeances(new ArrayList<>(List.of(seance)));
            FormationResponseDTO dto = mapper.toResponseDTO(f);

            assertThat(dto.getSeances()).hasSize(1);
            SeanceDTO sd = dto.getSeances().get(0);
            assertThat(sd.getIdSeance()).isEqualTo(10L);
            assertThat(sd.getDateSeance()).isEqualTo(LocalDate.of(2026, Month.APRIL, 1));
            assertThat(sd.getHeureDebut()).isEqualTo(LocalTime.of(9, 0));
            assertThat(sd.getHeureFin()).isEqualTo(LocalTime.of(12, 0));
            assertThat(sd.getSalle()).isEqualTo("S1");
            assertThat(sd.getTypeSeance()).isEqualTo(TypeSeanceEnum.THEORIQUE);
            assertThat(sd.getContenus()).isEqualTo("contenu");
            assertThat(sd.getMethodes()).isEqualTo("methode");
            assertThat(sd.getDureeTheorique()).isEqualTo(2f);
            assertThat(sd.getDureePratique()).isEqualTo(1f);
            assertThat(sd.getOnlineMeetingUrl()).isEqualTo("https://teams.url");
            assertThat(sd.getAnimateurs()).hasSize(1);
            assertThat(sd.getParticipants()).hasSize(1);
        }

        @Test
        @DisplayName("maps seance animateur with all fields")
        void withSeanceFull_animateurFields() {
            Enseignant e1 = new Enseignant();
            e1.setId("E1");
            e1.setNom("Nom");
            e1.setPrenom("Prenom");
            e1.setMail("e@e.com");
            e1.setType("A");
            e1.setEtat("A");
            e1.setCup("C");
            e1.setChefDepartement("N");
            e1.setGrade("Prof");
            e1.setTelephone("123");
            e1.setPhotoUrl("url");
            e1.setUserId("U1");
            Up eUp = new Up();
            eUp.setId("U1");
            eUp.setLibelle("UP");
            e1.setUp(eUp);
            Dept eDept = new Dept();
            eDept.setId("D1");
            eDept.setLibelle("Dept");
            e1.setDept(eDept);

            SeanceFormation seance = new SeanceFormation();
            seance.setIdSeance(10L);
            seance.setAnimateurs(new ArrayList<>(List.of(e1)));
            seance.setParticipants(new ArrayList<>(List.of(e1)));

            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setSeances(new ArrayList<>(List.of(seance)));
            FormationResponseDTO dto = mapper.toResponseDTO(f);

            EnseignantDTO ed = dto.getSeances().get(0).getAnimateurs().get(0);
            assertThat(ed.getId()).isEqualTo("E1");
            assertThat(ed.getNom()).isEqualTo("Nom");
            assertThat(ed.getPrenom()).isEqualTo("Prenom");
            assertThat(ed.getMail()).isEqualTo("e@e.com");
            assertThat(ed.getType()).isEqualTo("A");
            assertThat(ed.getEtat()).isEqualTo("A");
            assertThat(ed.getCup()).isEqualTo("C");
            assertThat(ed.getChefDepartement()).isEqualTo("N");
            assertThat(ed.getGrade()).isEqualTo("Prof");
            assertThat(ed.getTelephone()).isEqualTo("123");
            assertThat(ed.getPhotoUrl()).isEqualTo("url");
            assertThat(ed.getUserId()).isEqualTo("U1");
            assertThat(ed.getUpId()).isEqualTo("U1");
            assertThat(ed.getUpLibelle()).isEqualTo("UP");
            assertThat(ed.getDeptId()).isEqualTo("D1");
            assertThat(ed.getDeptLibelle()).isEqualTo("Dept");
        }

        @Test
        @DisplayName("enseignant with null up and dept → no NPE")
        void enseignantNullUpDept() {
            Enseignant e1 = new Enseignant();
            e1.setId("E1");
            e1.setNom("N");
            e1.setPrenom("P");
            e1.setUp(null);
            e1.setDept(null);

            SeanceFormation seance = new SeanceFormation();
            seance.setIdSeance(1L);
            seance.setAnimateurs(new ArrayList<>(List.of(e1)));
            seance.setParticipants(new ArrayList<>(List.of(e1)));

            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setSeances(new ArrayList<>(List.of(seance)));
            FormationResponseDTO dto = mapper.toResponseDTO(f);

            EnseignantDTO ed = dto.getSeances().get(0).getAnimateurs().get(0);
            assertThat(ed.getUpId()).isNull();
            assertThat(ed.getDeptId()).isNull();
        }

        @Test
        @DisplayName("empty animateurs list → empty DTO list")
        void emptyAnimateurs() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setAnimateurs(new ArrayList<>());
            f.setSeances(new ArrayList<>());
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getAnimateurs()).isEmpty();
        }

        @Test
        @DisplayName("null animateurs → empty list")
        void nullAnimateurs() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setAnimateurs(null);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getAnimateurs()).isEmpty();
        }

        @Test
        @DisplayName("animateursExternes - initialized list with content")
        void animateursExternesInitialized() {
            Bureau bureau = new Bureau();
            bureau.setId(1L);
            AnimateurExterne ae = new AnimateurExterne();
            ae.setId(1L);
            ae.setNom("ExtNom");
            ae.setPrenom("ExtPrenom");
            ae.setEmail("ext@e.com");
            ae.setBureau(bureau);

            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setAnimateursExternes(new ArrayList<>(List.of(ae)));
            FormationResponseDTO dto = mapper.toResponseDTO(f);

            assertThat(dto.getAnimateursExternes()).hasSize(1);
            assertThat(dto.getAnimateursExternes().get(0).getNom()).isEqualTo("ExtNom");
            assertThat(dto.getAnimateursExternes().get(0).getBureauId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("animateursExternes null → returns null")
        void animateursExternesNull() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setAnimateursExternes(null);
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getAnimateursExternes()).isNull();
        }

        @Test
        @DisplayName("empty seance list")
        void emptySeances() {
            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setSeances(new ArrayList<>());
            FormationResponseDTO dto = mapper.toResponseDTO(f);
            assertThat(dto.getSeances()).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // toEnseignantDTO (private, tested via toResponseDTO)
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("toEnseignantDTO (via toResponseDTO)")
    class EnseignantDTOMapping {

        @Test
        @DisplayName("enseignant with all fields mapped")
        void fullEnseignant() {
            Enseignant e = new Enseignant();
            e.setId("E100");
            e.setNom("Ben");
            e.setPrenom("Ali");
            e.setMail("ali@e.com");
            e.setType("P");
            e.setEtat("A");
            e.setCup("Y");
            e.setChefDepartement("Y");
            e.setGrade("Prof");
            e.setTelephone("555");
            e.setPhotoUrl("img.png");
            e.setUserId("U100");

            SeanceFormation seance = new SeanceFormation();
            seance.setIdSeance(1L);
            seance.setAnimateurs(new ArrayList<>(List.of(e)));

            Formation f = new Formation();
            f.setIdFormation(1L);
            f.setAnimateurs(new ArrayList<>(List.of(e)));
            f.setSeances(new ArrayList<>(List.of(seance)));
            FormationResponseDTO dto = mapper.toResponseDTO(f);

            esprit.pfe.serviceformation.dto.EnseignantDTO ed = dto.getAnimateurs().get(0);
            assertThat(ed.getId()).isEqualTo("E100");
            assertThat(ed.getNom()).isEqualTo("Ben");
            assertThat(ed.getPrenom()).isEqualTo("Ali");
            assertThat(ed.getMail()).isEqualTo("ali@e.com");
            assertThat(ed.getType()).isEqualTo("P");
            assertThat(ed.getEtat()).isEqualTo("A");
            assertThat(ed.getCup()).isEqualTo("Y");
            assertThat(ed.getChefDepartement()).isEqualTo("Y");
            assertThat(ed.getGrade()).isEqualTo("Prof");
            assertThat(ed.getTelephone()).isEqualTo("555");
            assertThat(ed.getPhotoUrl()).isEqualTo("img.png");
            assertThat(ed.getUserId()).isEqualTo("U100");
        }
    }
}
