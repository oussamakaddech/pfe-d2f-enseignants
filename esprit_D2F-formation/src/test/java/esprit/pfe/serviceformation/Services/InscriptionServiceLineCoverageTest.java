package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Month;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InscriptionService - Line Coverage Tests")
class InscriptionServiceLineCoverageTest {

    @Mock
    private FormationRepository formationRepo;
    @Mock
    private EnseignantRepository enseignantRepo;
    @Mock
    private InscriptionRepository inscriptionRepo;
    @Mock
    private FormationCompetenceRepository formationCompetenceRepo;

    @Spy
    private FormationMapper formationMapper = new FormationMapper();

    @InjectMocks
    private InscriptionService inscriptionService;

    private Formation formation;
    private Enseignant enseignant;
    private Up up;

    @BeforeEach
    void setUp() {
        up = new Up();
        up.setId("UP001");
        up.setLibelle("Informatique");

        Dept dept = new Dept();
        dept.setId("DEPT001");
        dept.setLibelle("Ingénierie");

        enseignant = new Enseignant();
        enseignant.setId("ENS001");
        enseignant.setNom("Dupont");
        enseignant.setPrenom("Jean");
        enseignant.setMail("jean@esprit.tn");
        enseignant.setUp(up);
        enseignant.setDept(dept);

        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Spring Boot");
        formation.setInscriptionsOuvertes(true);
        formation.setOuverte(true);
        formation.setUp(up);
        formation.setDateDebut(LocalDate.of(2026, Month.JUNE, 1));
        formation.setDateFin(LocalDate.of(2026, Month.JUNE, 5));
        formation.setSeances(new ArrayList<>());
        // InscriptionService uses @Lazy self-injection for @Transactional delegation.
        // In unit tests (no Spring context), self is null → set it via reflection.
        try {
            Field selfField = InscriptionService.class.getDeclaredField("self");
            selfField.setAccessible(true);
            selfField.set(inscriptionService, inscriptionService);
        } catch (Exception e) {
            throw new RuntimeException("Failed to inject self-reference", e);
        }
    }

    private Inscription buildInscription(EtatInscription etat) {
        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setFormation(formation);
        ins.setEnseignant(enseignant);
        ins.setEtat(etat);
        ins.setDateDemande(OffsetDateTime.now());
        return ins;
    }

    // ─────────────────────────────────────────────────────────────
    // listerFormationsAccessibles
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("listerFormationsAccessibles(String)")
    class ListerFormationsAccessibles {

        @Test
        @DisplayName("filters formations by inscriptionsOuvertes and ouverte")
        void filtersFormations() {
            Formation f2 = new Formation();
            f2.setIdFormation(2L);
            f2.setTitreFormation("Closed");
            f2.setInscriptionsOuvertes(false);
            f2.setOuverte(true);
            f2.setSeances(new ArrayList<>());

            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>(List.of(formation, f2)));

            List<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("ENS001");
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getTitreFormation()).isEqualTo("Spring Boot");
        }

        @Test
        @DisplayName("formation ouverte=false but matching UP is included")
        void matchingUp() {
            formation.setOuverte(false);
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>(List.of(formation)));

            List<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("ENS001");
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("formation ouverte=false and UP mismatch → excluded")
        void upMismatch() {
            formation.setOuverte(false);
            Up otherUp = new Up();
            otherUp.setId("OTHER");
            formation.setUp(otherUp);
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>(List.of(formation)));

            List<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("ENS001");
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("formation ouverte=false and formation UP null → excluded")
        void formationUpNull() {
            formation.setOuverte(false);
            formation.setUp(null);
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>(List.of(formation)));

            List<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("ENS001");
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("enseignant not found by id, fallback to findByMail")
        void fallbackToFindByMail() {
            when(enseignantRepo.findById("jean@esprit.tn")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("jean@esprit.tn")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>());

            List<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("jean@esprit.tn");
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("enseignant not found by id or mail, fallback to findByMailIgnoreCase")
        void fallbackToMailIgnoreCase() {
            when(enseignantRepo.findById("JEAN@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("JEAN@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("JEAN@ESPRIT.TN")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>());

            List<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("JEAN@ESPRIT.TN");
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("enseignant with null UP")
        void enseignantNullUp() {
            enseignant.setUp(null);
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>(List.of(formation)));

            List<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("ENS001");
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("throws when enseignant not found")
        void enseignantNotFound() {
            when(enseignantRepo.findById("UNKNOWN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("UNKNOWN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> inscriptionService.listerFormationsAccessibles("UNKNOWN"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Enseignant introuvable");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // listerFormationsAccessibles with Pageable
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("listerFormationsAccessibles(String, Pageable)")
    class ListerFormationsAccessiblesPaged {

        @Test
        @DisplayName("returns correct page slice")
        void pagedResult() {
            Formation f2 = new Formation();
            f2.setIdFormation(2L);
            f2.setTitreFormation("F2");
            f2.setInscriptionsOuvertes(true);
            f2.setOuverte(true);
            f2.setSeances(new ArrayList<>());

            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>(List.of(formation, f2)));

            Pageable pageable = PageRequest.of(0, 1);
            Page<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("ENS001", pageable);
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getTotalElements()).isEqualTo(2);
        }

        @Test
        @DisplayName("returns empty page when offset exceeds total")
        void emptyPage() {
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(formationRepo.findAll()).thenReturn(new ArrayList<>(List.of(formation)));

            Pageable pageable = PageRequest.of(5, 10);
            Page<FormationResponseDTO> result = inscriptionService.listerFormationsAccessibles("ENS001", pageable);
            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isEqualTo(1);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // demanderInscription
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("demanderInscription()")
    class DemanderInscription {

        @Test
        @DisplayName("creates inscription successfully")
        void success() {
            Inscription saved = buildInscription(EtatInscription.PENDING);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>());
            when(inscriptionRepo.save(any())).thenReturn(saved);

            Inscription result = inscriptionService.demanderInscription(1L, "ENS001");
            assertThat(result).isNotNull();
            verify(inscriptionRepo).save(any());
        }

        @Test
        @DisplayName("formation not found → exception")
        void formationNotFound() {
            when(formationRepo.findById(999L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> inscriptionService.demanderInscription(999L, "ENS001"))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("inscriptions not open → exception")
        void inscriptionsNotOpen() {
            formation.setInscriptionsOuvertes(false);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas visible");
        }

        @Test
        @DisplayName("enseignant not found → exception")
        void enseignantNotFound() {
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("ENS001")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("ENS001")).thenReturn(Optional.empty());
            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("UP mismatch on non-ouverte formation → exception")
        void upMismatch() {
            formation.setOuverte(false);
            Up otherUp = new Up();
            otherUp.setId("OTHER");
            enseignant.setUp(otherUp);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas autorisé");
        }

        @Test
        @DisplayName("UP mismatch with null formation up → exception")
        void formationUpNull() {
            formation.setOuverte(false);
            formation.setUp(null);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("overlapping dates → exception")
        void overlappingDates() {
            Inscription existing = buildInscription(EtatInscription.APPROVED);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>(List.of(existing)));

            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Chevauchement");
        }

        @Test
        @DisplayName("overlapping with REJECTED inscription → no overlap error")
        void rejectedNotOverlapping() {
            Inscription existing = buildInscription(EtatInscription.REJECTED);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>(List.of(existing)));
            when(inscriptionRepo.save(any())).thenReturn(buildInscription(EtatInscription.PENDING));

            Inscription result = inscriptionService.demanderInscription(1L, "ENS001");
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("save throws exception → illegal state duplicate message")
        void duplicateInscription() {
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>());
            when(inscriptionRepo.save(any())).thenThrow(new RuntimeException("constraint violation"));

            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("déjà fait");
        }

        @Test
        @DisplayName("isOverlapping with null dates returns false")
        void nullDatesNoOverlap() {
            formation.setDateDebut(null);
            formation.setDateFin(null);
            Inscription existing = buildInscription(EtatInscription.APPROVED);
            existing.getFormation().setDateDebut(null);
            existing.getFormation().setDateFin(null);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>(List.of(existing)));
            when(inscriptionRepo.save(any())).thenReturn(buildInscription(EtatInscription.PENDING));

            Inscription result = inscriptionService.demanderInscription(1L, "ENS001");
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("isOverlapping with null dates on existing formation")
        void existingNullDates() {
            Inscription existing = buildInscription(EtatInscription.APPROVED);
            existing.getFormation().setDateDebut(null);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>(List.of(existing)));
            when(inscriptionRepo.save(any())).thenReturn(buildInscription(EtatInscription.PENDING));

            Inscription result = inscriptionService.demanderInscription(1L, "ENS001");
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("enseignant found via findByMail")
        void foundByMail() {
            Enseignant ensByMail = new Enseignant();
            ensByMail.setId("ENS002");
            ensByMail.setMail("other@test.com");
            ensByMail.setUp(up);
            Inscription saved = buildInscription(EtatInscription.PENDING);
            saved.setEnseignant(ensByMail);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("other@test.com")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("other@test.com")).thenReturn(Optional.of(ensByMail));
            when(inscriptionRepo.findByEnseignant_Id("other@test.com")).thenReturn(new ArrayList<>());
            when(inscriptionRepo.save(any())).thenReturn(saved);

            Inscription result = inscriptionService.demanderInscription(1L, "other@test.com");
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("enseignant found via findByMailIgnoreCase")
        void foundByMailIgnoreCase() {
            Enseignant ensCI = new Enseignant();
            ensCI.setId("ENS003");
            ensCI.setMail("CI@TEST.COM");
            ensCI.setUp(up);
            Inscription saved = buildInscription(EtatInscription.PENDING);
            saved.setEnseignant(ensCI);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("CI@TEST.COM")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("CI@TEST.COM")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("CI@TEST.COM")).thenReturn(Optional.of(ensCI));
            when(inscriptionRepo.findByEnseignant_Id("CI@TEST.COM")).thenReturn(new ArrayList<>());
            when(inscriptionRepo.save(any())).thenReturn(saved);

            Inscription result = inscriptionService.demanderInscription(1L, "CI@TEST.COM");
            assertThat(result).isNotNull();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // traiterDemande
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("traiterDemande()")
    class TraiterDemande {

        @Test
        @DisplayName("approve with motif overload")
        void approveWithMotif() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = inscriptionService.traiterDemande(1L, true, "ok");
            assertThat(result.getEtat()).isEqualTo(EtatInscription.APPROVED);
            assertThat(result.getMotif()).isNull();
        }

        @Test
        @DisplayName("reject without motif")
        void rejectNoMotif() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = inscriptionService.traiterDemande(1L, false);
            assertThat(result.getEtat()).isEqualTo(EtatInscription.REJECTED);
            assertThat(result.getMotif()).isNull();
        }

        @Test
        @DisplayName("reject with motif")
        void rejectWithMotif() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = inscriptionService.traiterDemande(1L, false, "Not qualified");
            assertThat(result.getEtat()).isEqualTo(EtatInscription.REJECTED);
            assertThat(result.getMotif()).isEqualTo("Not qualified");
        }

        @Test
        @DisplayName("reject with empty motif → motif set to null")
        void rejectEmptyMotif() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = inscriptionService.traiterDemande(1L, false, "  ");
            assertThat(result.getMotif()).isNull();
        }

        @Test
        @DisplayName("reject with null motif → motif stays null")
        void rejectNullMotif() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = inscriptionService.traiterDemande(1L, false, null);
            assertThat(result.getMotif()).isNull();
        }

        @Test
        @DisplayName("inscription not found → exception")
        void notFound() {
            when(inscriptionRepo.findById(999L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> inscriptionService.traiterDemande(999L, true))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // listerToutesInscriptions
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("listerToutesInscriptions()")
    class ListerToutesInscriptions {

        @Test
        @DisplayName("returns paginated inscriptions")
        void paginated() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(inscriptionRepo.findAll(any(Pageable.class))).thenReturn(page);

            Page<InscriptionDTO> result = inscriptionService.listerToutesInscriptions(PageRequest.of(0, 10));
            assertThat(result.getContent()).hasSize(1);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // listerInscriptionsParFormation (paginated)
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("listerInscriptionsParFormation (Pageable)")
    class ListerInscriptionsParFormationPaged {

        @Test
        @DisplayName("returns paginated inscriptions for formation")
        void paginated() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(inscriptionRepo.findByFormation_IdFormation(eq(1L), any(Pageable.class))).thenReturn(page);

            Page<InscriptionDTO> result = inscriptionService.listerInscriptionsParFormation(1L, PageRequest.of(0, 10));
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("formation not found → exception")
        void formationNotFound() {
            when(formationRepo.findById(999L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> inscriptionService.listerInscriptionsParFormation(999L, PageRequest.of(0, 10)))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // listerInscriptionsParFormation (list)
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("listerInscriptionsParFormation(Long)")
    class ListerInscriptionsParFormationList {

        @Test
        @DisplayName("returns list of inscriptions for formation")
        void list() {
            Inscription ins = buildInscription(EtatInscription.APPROVED);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(inscriptionRepo.findByFormation_IdFormation(1L)).thenReturn(new ArrayList<>(List.of(ins)));

            List<InscriptionDTO> result = inscriptionService.listerInscriptionsParFormation(1L);
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("formation not found → exception")
        void formationNotFound() {
            when(formationRepo.findById(999L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> inscriptionService.listerInscriptionsParFormation(999L))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // traiterDemandeBulk
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("traiterDemandeBulk()")
    class TraiterDemandeBulk {

        @Test
        @DisplayName("returns empty list for null ids")
        void nullIds() {
            List<Inscription> result = inscriptionService.traiterDemandeBulk(null, true, null);
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("returns empty list for empty ids")
        void emptyIds() {
            List<Inscription> result = inscriptionService.traiterDemandeBulk(List.of(), true, null);
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("processes bulk approvals, ignoring nulls and duplicates")
        void bulkApproval() {
            Inscription ins1 = buildInscription(EtatInscription.PENDING);
            ins1.setId(1L);
            Inscription ins2 = buildInscription(EtatInscription.PENDING);
            ins2.setId(2L);

            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins1));
            when(inscriptionRepo.findById(2L)).thenReturn(Optional.of(ins2));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            List<Long> ids = new ArrayList<>();
            ids.add(1L);
            ids.add(null);
            ids.add(2L);
            ids.add(2L);
            List<Inscription> result = inscriptionService.traiterDemandeBulk(ids, true, null);
            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("silently ignores non-existent ids")
        void ignoresNonExistent() {
            when(inscriptionRepo.findById(999L)).thenReturn(Optional.empty());

            List<Inscription> result = inscriptionService.traiterDemandeBulk(
                    new ArrayList<>(List.of(999L)), true, null);
            assertThat(result).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // annulerInscription
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("annulerInscription()")
    class AnnulerInscription {

        @Test
        @DisplayName("cancels pending inscription by owner")
        void cancelPending() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));

            inscriptionService.annulerInscription(1L, "ENS001");
            verify(inscriptionRepo).delete(ins);
        }

        @Test
        @DisplayName("inscription not found → exception")
        void notFound() {
            when(inscriptionRepo.findById(999L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> inscriptionService.annulerInscription(999L, "ENS001"))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("wrong owner → exception")
        void wrongOwner() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));

            assertThatThrownBy(() -> inscriptionService.annulerInscription(1L, "OTHER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas autorisé");
        }

        @Test
        @DisplayName("null enseignantId → allowed (admin path)")
        void nullEnseignantId() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));

            inscriptionService.annulerInscription(1L, null);
            verify(inscriptionRepo).delete(ins);
        }

        @Test
        @DisplayName("non-PENDING inscription → exception")
        void nonPending() {
            Inscription ins = buildInscription(EtatInscription.APPROVED);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));

            assertThatThrownBy(() -> inscriptionService.annulerInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Seules les demandes en attente");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // mapSeanceToDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("mapSeanceToDTO()")
    class MapSeanceToDTO {

        @Test
        @DisplayName("maps all fields including animateurs and participants")
        void fullMapping() {
            Enseignant e = new Enseignant();
            e.setId("E1");
            e.setNom("N");
            e.setPrenom("P");
            e.setUp(null);
            e.setDept(null);

            SeanceFormation seance = new SeanceFormation();
            seance.setIdSeance(1L);
            seance.setDateSeance(LocalDate.of(2026, Month.MAY, 1));
            seance.setHeureDebut(LocalTime.of(9, 0));
            seance.setHeureFin(LocalTime.of(12, 0));
            seance.setSalle("S1");
            seance.setOnlineMeetingUrl("url");
            seance.setContenus("contenu");
            seance.setMethodes("methode");
            seance.setTypeSeance(TypeSeanceEnum.THEORIQUE);
            seance.setDureePratique(1f);
            seance.setDureeTheorique(2f);
            seance.setAnimateurs(new ArrayList<>(List.of(e)));
            seance.setParticipants(new ArrayList<>(List.of(e)));

            SeanceDTO dto = inscriptionService.mapSeanceToDTO(seance);
            assertThat(dto.getIdSeance()).isEqualTo(1L);
            assertThat(dto.getDateSeance()).isEqualTo(LocalDate.of(2026, Month.MAY, 1));
            assertThat(dto.getHeureDebut()).isEqualTo(LocalTime.of(9, 0));
            assertThat(dto.getHeureFin()).isEqualTo(LocalTime.of(12, 0));
            assertThat(dto.getSalle()).isEqualTo("S1");
            assertThat(dto.getOnlineMeetingUrl()).isEqualTo("url");
            assertThat(dto.getContenus()).isEqualTo("contenu");
            assertThat(dto.getMethodes()).isEqualTo("methode");
            assertThat(dto.getTypeSeance()).isEqualTo(TypeSeanceEnum.THEORIQUE);
            assertThat(dto.getDureePratique()).isEqualTo(1f);
            assertThat(dto.getDureeTheorique()).isEqualTo(2f);
            assertThat(dto.getAnimateurs()).hasSize(1);
            assertThat(dto.getParticipants()).hasSize(1);
        }

        @Test
        @DisplayName("null animateurs and participants")
        void nullLists() {
            SeanceFormation seance = new SeanceFormation();
            seance.setIdSeance(1L);
            seance.setAnimateurs(null);
            seance.setParticipants(null);

            SeanceDTO dto = inscriptionService.mapSeanceToDTO(seance);
            assertThat(dto.getAnimateurs()).isNull();
            assertThat(dto.getParticipants()).isNull();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // mapEnseignantToDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("mapEnseignantToDTO()")
    class MapEnseignantToDTO {

        @Test
        @DisplayName("maps basic fields with null dept and up")
        void nullDeptUp() {
            Enseignant e = new Enseignant();
            e.setId("E1");
            e.setNom("N");
            e.setPrenom("P");
            e.setMail("m@m.com");
            e.setType("T");
            e.setDept(null);
            e.setUp(null);

            EnseignantDTO dto = inscriptionService.mapEnseignantToDTO(e);
            assertThat(dto.getId()).isEqualTo("E1");
            assertThat(dto.getNom()).isEqualTo("N");
            assertThat(dto.getPrenom()).isEqualTo("P");
            assertThat(dto.getMail()).isEqualTo("m@m.com");
            assertThat(dto.getType()).isEqualTo("T");
            assertThat(dto.getDeptLibelle()).isNull();
            assertThat(dto.getUpLibelle()).isNull();
        }

        @Test
        @DisplayName("maps with non-null dept and up")
        void withDeptUp() {
            Dept dept = new Dept();
            dept.setLibelle("Dept1");
            Up up2 = new Up();
            up2.setLibelle("UP1");
            Enseignant e = new Enseignant();
            e.setId("E1");
            e.setNom("N");
            e.setPrenom("P");
            e.setMail("m@m.com");
            e.setType("T");
            e.setDept(dept);
            e.setUp(up2);

            EnseignantDTO dto = inscriptionService.mapEnseignantToDTO(e);
            assertThat(dto.getDeptLibelle()).isEqualTo("Dept1");
            assertThat(dto.getUpLibelle()).isEqualTo("UP1");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // mapInscriptionToDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("mapInscriptionToDTO()")
    class MapInscriptionToDTO {

        @Test
        @DisplayName("maps all fields")
        void fullMapping() {
            Inscription ins = buildInscription(EtatInscription.APPROVED);
            InscriptionDTO dto = inscriptionService.mapInscriptionToDTO(ins);
            assertThat(dto.getId()).isEqualTo(1L);
            assertThat(dto.getEtat()).isEqualTo("APPROVED");
            assertThat(dto.getFormation()).isNotNull();
            assertThat(dto.getEnseignant()).isNotNull();
            assertThat(dto.getDateDemande()).isNotNull();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // demanderInscriptionDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("demanderInscriptionDTO()")
    class DemanderInscriptionDTO {

        @Test
        @DisplayName("returns mapped DTO")
        void returnsDto() {
            Inscription saved = buildInscription(EtatInscription.PENDING);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>());
            when(inscriptionRepo.save(any())).thenReturn(saved);

            InscriptionDTO dto = inscriptionService.demanderInscriptionDTO(1L, "ENS001");
            assertThat(dto).isNotNull();
            assertThat(dto.getEtat()).isEqualTo("PENDING");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // traiterDemandeDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("traiterDemandeDTO()")
    class TraiterDemandeDTO {

        @Test
        @DisplayName("without motif")
        void withoutMotif() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            InscriptionDTO dto = inscriptionService.traiterDemandeDTO(1L, true);
            assertThat(dto.getEtat()).isEqualTo("APPROVED");
        }

        @Test
        @DisplayName("with motif")
        void withMotif() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            InscriptionDTO dto = inscriptionService.traiterDemandeDTO(1L, false, "reason");
            assertThat(dto.getEtat()).isEqualTo("REJECTED");
            assertThat(dto.getMotif()).isEqualTo("reason");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // traiterDemandeBulkDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("traiterDemandeBulkDTO()")
    class TraiterDemandeBulkDTO {

        @Test
        @DisplayName("returns mapped DTOs from bulk")
        void returnsDtoList() {
            Inscription ins1 = buildInscription(EtatInscription.PENDING);
            ins1.setId(1L);
            Inscription ins2 = buildInscription(EtatInscription.PENDING);
            ins2.setId(2L);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins1));
            when(inscriptionRepo.findById(2L)).thenReturn(Optional.of(ins2));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            List<InscriptionDTO> result = inscriptionService.traiterDemandeBulkDTO(
                    new ArrayList<>(List.of(1L, 2L)), true, null);
            assertThat(result).hasSize(2);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // annulerInscriptionDTO
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("annulerInscriptionDTO()")
    class AnnulerInscriptionDTO {

        @Test
        @DisplayName("delegates to annulerInscription")
        void delegates() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));

            inscriptionService.annulerInscriptionDTO(1L, "ENS001");
            verify(inscriptionRepo).delete(ins);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // findSummariesByCurrentUser
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("findSummariesByCurrentUser()")
    class FindSummariesByCurrentUser {

        @Test
        @DisplayName("resolves enseignant and delegates")
        void resolvesAndDelegates() {
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            Inscription ins = buildInscription(EtatInscription.APPROVED);
            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(inscriptionRepo.findByEnseignant_Id(eq("ENS001"), any(Pageable.class))).thenReturn(page);
            when(formationCompetenceRepo.findByFormationIdFormation(1L)).thenReturn(new ArrayList<>());

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByCurrentUser("ENS001", PageRequest.of(0, 10));
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("resolves by findByMail")
        void resolvesByMail() {
            when(enseignantRepo.findById("jean@e.com")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("jean@e.com")).thenReturn(Optional.of(enseignant));
            Page<Inscription> page = new PageImpl<>(new ArrayList<>(), PageRequest.of(0, 10), 0);
            when(inscriptionRepo.findByEnseignant_Id(eq("ENS001"), any(Pageable.class))).thenReturn(page);

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByCurrentUser("jean@e.com", PageRequest.of(0, 10));
            assertThat(result.getContent()).isEmpty();
        }

        @Test
        @DisplayName("resolves by findByMailIgnoreCase")
        void resolvesByMailIgnoreCase() {
            when(enseignantRepo.findById("JEAN@E.COM")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("JEAN@E.COM")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("JEAN@E.COM")).thenReturn(Optional.of(enseignant));
            Page<Inscription> page = new PageImpl<>(new ArrayList<>(), PageRequest.of(0, 10), 0);
            when(inscriptionRepo.findByEnseignant_Id(eq("ENS001"), any(Pageable.class))).thenReturn(page);

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByCurrentUser("JEAN@E.COM", PageRequest.of(0, 10));
            assertThat(result.getContent()).isEmpty();
        }

        @Test
        @DisplayName("not found → exception")
        void notFound() {
            when(enseignantRepo.findById("X")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("X")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("X")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> inscriptionService.findSummariesByCurrentUser("X", PageRequest.of(0, 10)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Enseignant introuvable");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // findSummariesByEnseignantId
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("findSummariesByEnseignantId()")
    class FindSummariesByEnseignantId {

        @Test
        @DisplayName("returns mapped summaries with competences")
        void withCompetences() {
            Inscription ins = buildInscription(EtatInscription.APPROVED);
            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(inscriptionRepo.findByEnseignant_Id("ENS001", PageRequest.of(0, 10))).thenReturn(page);

            FormationCompetence fc = new FormationCompetence();
            fc.setCompetenceNom("Java");
            when(formationCompetenceRepo.findByFormationIdFormation(1L)).thenReturn(new ArrayList<>(List.of(fc)));

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByEnseignantId("ENS001", PageRequest.of(0, 10));
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getCompetencesCiblees()).containsExactly("Java");
        }

        @Test
        @DisplayName("competence with null nom → uses id as string")
        void competenceNullNom() {
            Inscription ins = buildInscription(EtatInscription.PENDING);
            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(inscriptionRepo.findByEnseignant_Id("ENS001", PageRequest.of(0, 10))).thenReturn(page);

            FormationCompetence fc = new FormationCompetence();
            fc.setCompetenceNom(null);
            fc.setCompetenceId(42L);
            when(formationCompetenceRepo.findByFormationIdFormation(1L)).thenReturn(new ArrayList<>(List.of(fc)));

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByEnseignantId("ENS001", PageRequest.of(0, 10));
            assertThat(result.getContent().get(0).getCompetencesCiblees()).containsExactly("42");
        }

        @Test
        @DisplayName("formation with null dates and etat")
        void nullDatesAndEtat() {
            Formation fNullDates = new Formation();
            fNullDates.setIdFormation(2L);
            fNullDates.setTitreFormation("F2");
            fNullDates.setDateDebut(null);
            fNullDates.setDateFin(null);
            fNullDates.setEtatFormation(null);
            fNullDates.setChargeHoraireGlobal(null);

            Inscription ins = new Inscription();
            ins.setId(2L);
            ins.setFormation(fNullDates);
            ins.setEnseignant(enseignant);
            ins.setEtat(null);
            ins.setDateDemande(null);
            ins.setDateTraitement(null);
            ins.setMotif("reason");

            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(inscriptionRepo.findByEnseignant_Id("ENS001", PageRequest.of(0, 10))).thenReturn(page);
            when(formationCompetenceRepo.findByFormationIdFormation(2L)).thenReturn(new ArrayList<>());

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByEnseignantId("ENS001", PageRequest.of(0, 10));
            InscriptionSummaryDTO summary = result.getContent().get(0);
            assertThat(summary.getDateDebut()).isEmpty();
            assertThat(summary.getDateFin()).isEmpty();
            assertThat(summary.getChargeHoraire()).isEqualTo("null");
            assertThat(summary.getEtatFormation()).isEmpty();
            assertThat(summary.getEtat()).isNull();
            assertThat(summary.getDateDemande()).isNull();
            assertThat(summary.getDateTraitement()).isNull();
            assertThat(summary.getMotif()).isEqualTo("reason");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // toSummary (via findSummariesByEnseignantId)
    // ─────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("toSummary()")
    class ToSummary {

        @Test
        @DisplayName("with non-null dateTraitement")
        void withDateTraitement() {
            Inscription ins = buildInscription(EtatInscription.APPROVED);
            ins.setDateTraitement(OffsetDateTime.now());
            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(inscriptionRepo.findByEnseignant_Id("ENS001", PageRequest.of(0, 10))).thenReturn(page);
            when(formationCompetenceRepo.findByFormationIdFormation(1L)).thenReturn(new ArrayList<>());

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByEnseignantId("ENS001", PageRequest.of(0, 10));
            assertThat(result.getContent().get(0).getDateTraitement()).isNotNull();
        }

        @Test
        @DisplayName("with null etat")
        void withNullEtat() {
            Inscription ins = buildInscription(EtatInscription.APPROVED);
            ins.setEtat(null);
            Page<Inscription> page = new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1);
            when(inscriptionRepo.findByEnseignant_Id("ENS001", PageRequest.of(0, 10))).thenReturn(page);
            when(formationCompetenceRepo.findByFormationIdFormation(1L)).thenReturn(new ArrayList<>());

            Page<InscriptionSummaryDTO> result = inscriptionService.findSummariesByEnseignantId("ENS001", PageRequest.of(0, 10));
            assertThat(result.getContent().get(0).getEtat()).isNull();
        }
    }
}

