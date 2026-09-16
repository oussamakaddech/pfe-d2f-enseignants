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
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalTime;
import java.time.LocalDate;
import java.time.Month;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InscriptionService - Tests supplementaires pour couverture maximale")
class InscriptionServiceExtraTest {

    @Mock private FormationRepository formationRepo;
    @Mock private EnseignantRepository enseignantRepo;
    @Mock private InscriptionRepository inscriptionRepo;
    @Mock private FormationCompetenceRepository formationCompetenceRepo;
    @Mock private FormationMapper formationMapper;
    @InjectMocks private InscriptionService service;

    @BeforeEach
    void wireSelfReference() {
        ReflectionTestUtils.setField(service, "self", service);
        ReflectionTestUtils.setField(service, "formationMapper", formationMapper);
    }

    private Formation createFormation(Long id, boolean inscriptionsOuvertes, boolean ouverte) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setInscriptionsOuvertes(inscriptionsOuvertes);
        f.setOuverte(ouverte);
        f.setTitreFormation("Formation " + id);
        f.setChargeHoraireGlobal(40);
        f.setSeances(new ArrayList<>());
        f.setCoutFormation(0f);
        return f;
    }

    private Formation createFormationWithUp(Long id, boolean inscriptionsOuvertes, boolean ouverte, Up up) {
        Formation f = createFormation(id, inscriptionsOuvertes, ouverte);
        f.setUp(up);
        return f;
    }

    private Enseignant createEnseignant(String id, Up up) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setNom("Nom" + id);
        e.setPrenom("Prenom" + id);
        e.setMail(id + "@esprit.tn");
        e.setType("P");
        e.setUp(up);
        e.setDept(null);
        return e;
    }

    private Inscription createInscription(Long id, Formation f, Enseignant e, EtatInscription etat) {
        Inscription ins = new Inscription();
        ins.setId(id);
        ins.setFormation(f);
        ins.setEnseignant(e);
        ins.setEtat(etat);
        ins.setDateDemande(java.time.OffsetDateTime.now().minusDays(5));
        return ins;
    }

    // ─── listerToutesInscriptions ──────────────────────────────────────

    @Nested
    @DisplayName("listerToutesInscriptions(Pageable)")
    class ListerToutesInscriptions {

        @Test
        @DisplayName("retourne une page paginée de toutes les inscriptions")
        void shouldReturnPaginatedInscriptions() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(1L, f, e, EtatInscription.PENDING);

            when(inscriptionRepo.findAll(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1));

            Page<InscriptionDTO> result = service.listerToutesInscriptions(PageRequest.of(0, 10));

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getId()).isEqualTo(1L);
            assertThat(result.getContent().get(0).getEtat()).isEqualTo("PENDING");
            verify(formationMapper).toResponseDTO(f);
        }

        @Test
        @DisplayName("retourne une page vide quand aucune inscription")
        void shouldReturnEmptyPage() {
            when(inscriptionRepo.findAll(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0));

            Page<InscriptionDTO> result = service.listerToutesInscriptions(PageRequest.of(0, 10));

            assertThat(result).isNotNull();
            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
        }
    }

    // ─── traiterDemande 3-arg (motif handling) ─────────────────────────

    @Nested
    @DisplayName("traiterDemande(Long, boolean, String) - gestion du motif")
    class TraiterDemandeAvecMotif {

        @Test
        @DisplayName("rejet avec motif non vide persiste le motif")
        void shouldPersistMotifOnRejection() {
            Inscription ins = createInscription(10L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = service.traiterDemande(10L, false, "Non conforme");

            assertThat(result.getEtat()).isEqualTo(EtatInscription.REJECTED);
            assertThat(result.getMotif()).isEqualTo("Non conforme");
            assertThat(result.getDateTraitement()).isNotNull();
        }

        @Test
        @DisplayName("rejet avec motif vide met le motif à null")
        void shouldSetMotifNullWhenEmpty() {
            Inscription ins = createInscription(11L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);

            when(inscriptionRepo.findById(11L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = service.traiterDemande(11L, false, "   ");

            assertThat(result.getEtat()).isEqualTo(EtatInscription.REJECTED);
            assertThat(result.getMotif()).isNull();
        }

        @Test
        @DisplayName("rejet avec motif null met le motif à null")
        void shouldSetMotifNullWhenNull() {
            Inscription ins = createInscription(12L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);

            when(inscriptionRepo.findById(12L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = service.traiterDemande(12L, false, null);

            assertThat(result.getEtat()).isEqualTo(EtatInscription.REJECTED);
            assertThat(result.getMotif()).isNull();
        }

        @Test
        @DisplayName("approbation efface le motif existant")
        void shouldClearMotifOnApproval() {
            Inscription ins = createInscription(13L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);
            ins.setMotif("ancien motif");

            when(inscriptionRepo.findById(13L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = service.traiterDemande(13L, true, "ignoré");

            assertThat(result.getEtat()).isEqualTo(EtatInscription.APPROVED);
            assertThat(result.getMotif()).isNull();
            assertThat(result.getDateTraitement()).isNotNull();
        }

        @Test
        @DisplayName("lève exception si inscription introuvable")
        void shouldThrowWhenNotFound() {
            when(inscriptionRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.traiterDemande(999L, true, "motif"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    // ─── annulerInscription ────────────────────────────────────────────

    @Nested
    @DisplayName("annulerInscription(Long, String)")
    class AnnulerInscription {

        @Test
        @DisplayName("supprime une inscription PENDING quand propriétaire")
        void shouldCancelWhenPendingAndOwner() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(10L, f, e, EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));

            service.annulerInscription(10L, "E1");

            verify(inscriptionRepo).delete(ins);
        }

        @Test
        @DisplayName("supprime quand enseignantId est null (appel admin)")
        void shouldCancelWhenEnseignantIdNull() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(10L, f, e, EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));

            service.annulerInscription(10L, null);

            verify(inscriptionRepo).delete(ins);
        }

        @Test
        @DisplayName("supprime quand l'enseignant de l'inscription est null")
        void shouldCancelWhenInscriptionEnseignantNull() {
            Formation f = createFormation(1L, true, true);
            Inscription ins = createInscription(10L, f, null, EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));

            service.annulerInscription(10L, "E1");

            verify(inscriptionRepo).delete(ins);
        }

        @Test
        @DisplayName("refuse si inscription introuvable")
        void shouldThrowWhenNotFound() {
            when(inscriptionRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.annulerInscription(999L, "E1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }

        @Test
        @DisplayName("refuse si enseignant n'est pas propriétaire")
        void shouldThrowWhenNotOwner() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(10L, f, e, EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));

            assertThatThrownBy(() -> service.annulerInscription(10L, "E2"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas autorisé");
        }

        @Test
        @DisplayName("refuse si l'état n'est pas PENDING")
        void shouldThrowWhenNotPending() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(10L, f, e, EtatInscription.APPROVED);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));

            assertThatThrownBy(() -> service.annulerInscription(10L, "E1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("attente");
        }

        @Test
        @DisplayName("refuse si l'état est REJECTED")
        void shouldThrowWhenRejected() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(10L, f, e, EtatInscription.REJECTED);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));

            assertThatThrownBy(() -> service.annulerInscription(10L, "E1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("attente");
        }
    }

    // ─── annulerInscriptionDTO ─────────────────────────────────────────

    @Nested
    @DisplayName("annulerInscriptionDTO(Long, String)")
    class AnnulerInscriptionDTO {

        @Test
        @DisplayName("délègue à annulerInscription et supprime")
        void shouldDelegateAndCancel() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(10L, f, e, EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));

            service.annulerInscriptionDTO(10L, "E1");

            verify(inscriptionRepo).delete(ins);
        }
    }

    // ─── demanderInscriptionDTO ────────────────────────────────────────

    @Nested
    @DisplayName("demanderInscriptionDTO(Long, String)")
    class DemanderInscriptionDTO {

        @Test
        @DisplayName("retourne le DTO correspondant à l'inscription créée")
        void shouldReturnMappedDTO() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription saved = createInscription(1L, f, e, EtatInscription.PENDING);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(f));
            when(enseignantRepo.findById("E1")).thenReturn(Optional.of(e));
            when(inscriptionRepo.findByEnseignant_Id("E1")).thenReturn(Collections.emptyList());
            when(inscriptionRepo.save(any())).thenReturn(saved);
            when(formationMapper.toResponseDTO(f)).thenReturn(new FormationResponseDTO());

            InscriptionDTO result = service.demanderInscriptionDTO(1L, "E1");

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            verify(formationMapper).toResponseDTO(f);
        }
    }

    // ─── traiterDemandeDTO ─────────────────────────────────────────────

    @Nested
    @DisplayName("traiterDemandeDTO(Long, boolean) et traiterDemandeDTO(Long, boolean, String)")
    class TraiterDemandeDTO {

        @Test
        @DisplayName("traiterDemandeDTO 2-arg retourne le DTO mappé")
        void shouldReturnDTOfor2Arg() {
            Inscription ins = createInscription(10L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(formationMapper.toResponseDTO(any())).thenReturn(new FormationResponseDTO());

            InscriptionDTO result = service.traiterDemandeDTO(10L, true);

            assertThat(result).isNotNull();
            verify(inscriptionRepo).save(any());
        }

        @Test
        @DisplayName("traiterDemandeDTO 3-arg retourne le DTO mappé")
        void shouldReturnDTOfor3Arg() {
            Inscription ins = createInscription(10L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);

            when(inscriptionRepo.findById(10L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(formationMapper.toResponseDTO(any())).thenReturn(new FormationResponseDTO());

            InscriptionDTO result = service.traiterDemandeDTO(10L, false, "Motif test");

            assertThat(result).isNotNull();
            assertThat(result.getEtat()).isEqualTo("REJECTED");
        }
    }

    // ─── traiterDemandeBulkDTO ─────────────────────────────────────────

    @Nested
    @DisplayName("traiterDemandeBulkDTO(List<Long>, boolean, String)")
    class TraiterDemandeBulkDTO {

        @Test
        @DisplayName("retourne les DTOs mappés des inscriptions traitées")
        void shouldReturnMappedDTOs() {
            Inscription a = createInscription(1L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);
            Inscription b = createInscription(2L,
                    createFormation(2L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);

            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(a));
            when(inscriptionRepo.findById(2L)).thenReturn(Optional.of(b));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(formationMapper.toResponseDTO(any())).thenReturn(new FormationResponseDTO());

            List<InscriptionDTO> result = service.traiterDemandeBulkDTO(List.of(1L, 2L), true, null);

            assertThat(result).hasSize(2);
            verify(formationMapper, atLeast(2)).toResponseDTO(any());
        }

        @Test
        @DisplayName("retourne liste vide pour entrée vide/null")
        void shouldReturnEmptyForEmptyInput() {
            assertThat(service.traiterDemandeBulkDTO(List.of(), true, null)).isEmpty();
            assertThat(service.traiterDemandeBulkDTO(null, true, null)).isEmpty();
        }
    }

    // ─── findSummariesByCurrentUser ────────────────────────────────────

    @Nested
    @DisplayName("findSummariesByCurrentUser(String, Pageable)")
    class FindSummariesByCurrentUser {

        @Test
        @DisplayName("résout l'enseignant par ID et retourne les résumés")
        void shouldResolveByIdAndReturnSummaries() {
            Enseignant e = createEnseignant("E1", null);
            Formation f = createFormation(1L, true, true);
            f.setDateDebut(LocalDate.of(2025, Month.MARCH, 1));
            f.setDateFin(LocalDate.of(2025, Month.MARCH, 5));
            f.setEtatFormation(EtatFormation.PLANIFIE);

            Inscription ins = createInscription(10L, f, e, EtatInscription.APPROVED);

            when(enseignantRepo.findById("E1")).thenReturn(Optional.of(e));
            when(inscriptionRepo.findByEnseignant_Id("E1", PageRequest.of(0, 10)))
                    .thenReturn(new PageImpl<>(List.of(ins), PageRequest.of(0, 10), 1));
            when(formationCompetenceRepo.findByFormationIdFormation(1L))
                    .thenReturn(Collections.emptyList());

            Page<InscriptionSummaryDTO> result = service.findSummariesByCurrentUser("E1", PageRequest.of(0, 10));

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            InscriptionSummaryDTO dto = result.getContent().get(0);
            assertThat(dto.getId()).isEqualTo(10L);
            assertThat(dto.getTitreFormation()).isEqualTo("Formation 1");
            assertThat(dto.getEtat()).isEqualTo("APPROVED");
        }

        @Test
        @DisplayName("résout par mail quand ID non trouvé")
        void shouldResolveByMail() {
            Enseignant e = createEnseignant("E1", null);
            when(enseignantRepo.findById("user@test.com")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("user@test.com")).thenReturn(Optional.of(e));
            when(inscriptionRepo.findByEnseignant_Id("E1", PageRequest.of(0, 10)))
                    .thenReturn(new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0));

            Page<InscriptionSummaryDTO> result = service.findSummariesByCurrentUser("user@test.com", PageRequest.of(0, 10));

            assertThat(result).isNotNull();
            assertThat(result.getContent()).isEmpty();
        }

        @Test
        @DisplayName("résout par mailIgnoreCase quand findById et findByMail échouent")
        void shouldResolveByMailIgnoreCase() {
            Enseignant e = createEnseignant("E1", null);
            when(enseignantRepo.findById("USER@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("USER@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("USER@ESPRIT.TN")).thenReturn(Optional.of(e));
            when(inscriptionRepo.findByEnseignant_Id("E1", PageRequest.of(0, 10)))
                    .thenReturn(new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0));

            Page<InscriptionSummaryDTO> result = service.findSummariesByCurrentUser("USER@ESPRIT.TN", PageRequest.of(0, 10));

            assertThat(result).isNotNull();
            verify(enseignantRepo).findByMailIgnoreCase("USER@ESPRIT.TN");
        }

        @Test
        @DisplayName("lève exception si aucun enseignant trouvé")
        void shouldThrowWhenEnseignantNotFound() {
            when(enseignantRepo.findById("UNKNOWN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("UNKNOWN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

            Pageable pageable = PageRequest.of(0, 10);
            assertThatThrownBy(() -> service.findSummariesByCurrentUser("UNKNOWN", pageable))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    // ─── findSummariesByEnseignantId ───────────────────────────────────

    @Nested
    @DisplayName("findSummariesByEnseignantId(String, Pageable)")
    class FindSummariesByEnseignantId {

        @Test
        @DisplayName("retourne les résumés paginés pour un enseignant")
        void shouldReturnPaginatedSummaries() {
            Enseignant e = createEnseignant("E1", null);
            Formation f = createFormation(1L, true, true);
            f.setDateDebut(LocalDate.of(2025, Month.JUNE, 1));
            f.setDateFin(LocalDate.of(2025, Month.JUNE, 10));
            f.setEtatFormation(EtatFormation.EN_COURS);

            Inscription ins = createInscription(1L, f, e, EtatInscription.PENDING);
            ins.setDateDemande(null);
            ins.setDateTraitement(null);

            FormationCompetence fc = new FormationCompetence();
            fc.setCompetenceId(100L);
            fc.setCompetenceNom("Java");

            when(inscriptionRepo.findByEnseignant_Id("E1", PageRequest.of(0, 5)))
                    .thenReturn(new PageImpl<>(List.of(ins), PageRequest.of(0, 5), 1));
            when(formationCompetenceRepo.findByFormationIdFormation(1L))
                    .thenReturn(List.of(fc));

            Page<InscriptionSummaryDTO> result = service.findSummariesByEnseignantId("E1", PageRequest.of(0, 5));

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            InscriptionSummaryDTO dto = result.getContent().get(0);
            assertThat(dto.getCompetencesCiblees()).containsExactly("Java");
            assertThat(dto.getEtat()).isEqualTo("PENDING");
            assertThat(dto.getDateDemande()).isNull();
            assertThat(dto.getDateTraitement()).isNull();
        }

        @Test
        @DisplayName("gère les competences sans nom (fallback sur competenceId)")
        void shouldFallbackToCompetenceIdWhenNomNull() {
            Enseignant e = createEnseignant("E1", null);
            Formation f = createFormation(1L, true, true);

            Inscription ins = createInscription(1L, f, e, EtatInscription.APPROVED);

            FormationCompetence fc = new FormationCompetence();
            fc.setCompetenceId(200L);
            fc.setCompetenceNom(null);

            when(inscriptionRepo.findByEnseignant_Id("E1", PageRequest.of(0, 5)))
                    .thenReturn(new PageImpl<>(List.of(ins), PageRequest.of(0, 5), 1));
            when(formationCompetenceRepo.findByFormationIdFormation(1L))
                    .thenReturn(List.of(fc));

            Page<InscriptionSummaryDTO> result = service.findSummariesByEnseignantId("E1", PageRequest.of(0, 5));

            assertThat(result.getContent().get(0).getCompetencesCiblees())
                    .containsExactly("200");
        }

        @Test
        @DisplayName("retourne liste vide de competences quand aucune n'est définie")
        void shouldReturnEmptyCompetenceListWhenNone() {
            Enseignant e = createEnseignant("E1", null);
            Formation f = createFormation(1L, true, true);

            Inscription ins = createInscription(1L, f, e, EtatInscription.PENDING);

            when(inscriptionRepo.findByEnseignant_Id("E1", PageRequest.of(0, 5)))
                    .thenReturn(new PageImpl<>(List.of(ins), PageRequest.of(0, 5), 1));
            when(formationCompetenceRepo.findByFormationIdFormation(1L))
                    .thenReturn(Collections.emptyList());

            Page<InscriptionSummaryDTO> result = service.findSummariesByEnseignantId("E1", PageRequest.of(0, 5));

            assertThat(result.getContent().get(0).getCompetencesCiblees()).isEmpty();
        }
    }

    // ─── toSummary – branches manquantes ───────────────────────────────

    @Nested
    @DisplayName("toSummary - gestion des valeurs nulles")
    class ToSummaryBranches {

        @Test
        @DisplayName("gère dates de formation et etatFormation null")
        void shouldHandleNullFormationDatesAndEtat() {
            Enseignant e = createEnseignant("E1", null);
            Formation f = createFormation(1L, true, true);
            f.setDateDebut(null);
            f.setDateFin(null);
            f.setEtatFormation(null);

            Inscription ins = createInscription(1L, f, e, EtatInscription.PENDING);
            ins.setDateDemande(null);
            ins.setDateTraitement(null);
            ins.setMotif(null);

            when(inscriptionRepo.findByEnseignant_Id("E1", PageRequest.of(0, 5)))
                    .thenReturn(new PageImpl<>(List.of(ins), PageRequest.of(0, 5), 1));
            when(formationCompetenceRepo.findByFormationIdFormation(1L))
                    .thenReturn(Collections.emptyList());

            Page<InscriptionSummaryDTO> result = service.findSummariesByEnseignantId("E1", PageRequest.of(0, 5));

            InscriptionSummaryDTO dto = result.getContent().get(0);
            assertThat(dto.getDateDebut()).isEmpty();
            assertThat(dto.getDateFin()).isEmpty();
            assertThat(dto.getEtatFormation()).isEmpty();
            assertThat(dto.getEtat()).isEqualTo("PENDING");
            assertThat(dto.getDateDemande()).isNull();
            assertThat(dto.getDateTraitement()).isNull();
            assertThat(dto.getMotif()).isNull();
        }
    }

    // ─── listerFormationsAccessibles – findByMailIgnoreCase fallback ───

    @Nested
    @DisplayName("listerFormationsAccessibles - résolution par findByMailIgnoreCase")
    class ListerFormationsMailIgnoreCase {

        @Test
        @DisplayName("résout l'enseignant via findByMailIgnoreCase")
        void shouldResolveByMailIgnoreCase() {
            Enseignant e = createEnseignant("E1", null);
            when(enseignantRepo.findById("USER@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("USER@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("USER@ESPRIT.TN")).thenReturn(Optional.of(e));

            Formation f = createFormation(1L, true, true);
            when(formationRepo.findAll()).thenReturn(List.of(f));
            when(formationMapper.toResponseDTO(f)).thenReturn(new FormationResponseDTO());

            List<FormationResponseDTO> result = service.listerFormationsAccessibles("USER@ESPRIT.TN");

            assertThat(result).hasSize(1);
            verify(enseignantRepo).findByMailIgnoreCase("USER@ESPRIT.TN");
        }
    }

    // ─── demanderInscription – findByMailIgnoreCase fallback ───────────

    @Nested
    @DisplayName("demanderInscription - résolution par findByMailIgnoreCase")
    class DemanderInscriptionMailIgnoreCase {

        @Test
        @DisplayName("résout l'enseignant via findByMailIgnoreCase pour la demande")
        void shouldResolveByMailIgnoreCaseForDemande() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(f));
            when(enseignantRepo.findById("USER@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMail("USER@ESPRIT.TN")).thenReturn(Optional.empty());
            when(enseignantRepo.findByMailIgnoreCase("USER@ESPRIT.TN")).thenReturn(Optional.of(e));
            when(inscriptionRepo.findByEnseignant_Id("USER@ESPRIT.TN")).thenReturn(Collections.emptyList());
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = service.demanderInscription(1L, "USER@ESPRIT.TN");

            assertThat(result).isNotNull();
            verify(enseignantRepo).findByMailIgnoreCase("USER@ESPRIT.TN");
        }
    }

    // ─── demanderInscription – UP null pour formation + enseignant ─────

    @Nested
    @DisplayName("demanderInscription - cas limites UP null")
    class DemanderInscriptionUpNull {

        @Test
        @DisplayName("refuse quand formation non ouverte et upForm null (UP enseignant null)")
        void shouldRejectWhenFormationUpNullAndEnseignantUpNull() {
            Formation f = createFormationWithUp(1L, true, false, null);
            Enseignant e = createEnseignant("E1", null);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(f));
            when(enseignantRepo.findById("E1")).thenReturn(Optional.of(e));

            assertThatThrownBy(() -> service.demanderInscription(1L, "E1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas autorisé");
        }

        @Test
        @DisplayName("refuse quand formation non ouverte et upForm null mais upEns non null")
        void shouldRejectWhenFormationUpNullButEnseignantUpNotNull() {
            Formation f = createFormationWithUp(1L, true, false, null);
            Up upEns = new Up();
            upEns.setId("UP1");
            Enseignant e = createEnseignant("E1", upEns);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(f));
            when(enseignantRepo.findById("E1")).thenReturn(Optional.of(e));

            assertThatThrownBy(() -> service.demanderInscription(1L, "E1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas autorisé");
        }
    }

    // ─── validateNoOverlap – existing formation with null dates ────────

    @Nested
    @DisplayName("validateNoOverlap - dates nulles sur inscription existante")
    class ValidateNoOverlapEdgeCases {

        @Test
        @DisplayName("pas de chevauchement quand l'inscription existante a des dates nulles")
        void shouldNotOverlapWhenExistingDatesNull() {
            Formation fTarget = createFormation(1L, true, true);
            fTarget.setDateDebut(LocalDate.of(2025, Month.JUNE, 1));
            fTarget.setDateFin(LocalDate.of(2025, Month.JUNE, 10));

            Formation fExisting = createFormation(2L, true, true);
            fExisting.setDateDebut(null);
            fExisting.setDateFin(null);

            Enseignant e = createEnseignant("E1", null);

            Inscription existing = createInscription(10L, fExisting, e, EtatInscription.APPROVED);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(fTarget));
            when(enseignantRepo.findById("E1")).thenReturn(Optional.of(e));
            when(inscriptionRepo.findByEnseignant_Id("E1")).thenReturn(List.of(existing));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = service.demanderInscription(1L, "E1");

            assertThat(result).isNotNull();
            verify(inscriptionRepo).save(any());
        }

        @Test
        @DisplayName("pas de chevauchement quand la cible a des dates nulles")
        void shouldNotOverlapWhenTargetDatesNull() {
            Formation fTarget = createFormation(1L, true, true);
            fTarget.setDateDebut(null);
            fTarget.setDateFin(null);

            Formation fExisting = createFormation(2L, true, true);
            fExisting.setDateDebut(LocalDate.of(2025, Month.JUNE, 1));
            fExisting.setDateFin(LocalDate.of(2025, Month.JUNE, 10));

            Enseignant e = createEnseignant("E1", null);

            Inscription existing = createInscription(10L, fExisting, e, EtatInscription.APPROVED);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(fTarget));
            when(enseignantRepo.findById("E1")).thenReturn(Optional.of(e));
            when(inscriptionRepo.findByEnseignant_Id("E1")).thenReturn(List.of(existing));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = service.demanderInscription(1L, "E1");

            assertThat(result).isNotNull();
        }
    }

    // ─── traiterDemandeBulk – null entries & dedup ─────────────────────

    @Nested
    @DisplayName("traiterDemandeBulk - dedup et null entries")
    class TraiterDemandeBulkEdgeCases {

        @Test
        @DisplayName("ignore les ids null et élimine les doublons")
        void shouldIgnoreNullsAndDedup() {
            Inscription a = createInscription(1L,
                    createFormation(1L, true, true),
                    createEnseignant("E1", null),
                    EtatInscription.PENDING);

            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(a));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            List<Inscription> result = service.traiterDemandeBulk(
                    Arrays.asList(null, 1L, 1L, null), true, null);

            assertThat(result).hasSize(1);
            verify(inscriptionRepo, times(1)).save(any());
        }
    }

    // ─── mapEnseignantToDTO – with valid dept and up ──────────────────

    @Nested
    @DisplayName("mapEnseignantToDTO - avec dept et up non null")
    class MapEnseignantToDTOWithDeptAndUp {

        @Test
        @DisplayName("mappe deptLibelle et upLibelle quand non null")
        void shouldMapDeptAndUp() {
            Dept dept = new Dept();
            dept.setId("D1");
            dept.setLibelle("Informatique");

            Up up = new Up();
            up.setId("UP1");
            up.setLibelle("UP Info");

            Enseignant e = new Enseignant();
            e.setId("E1");
            e.setNom("Test");
            e.setPrenom("User");
            e.setMail("test@esprit.tn");
            e.setType("P");
            e.setDept(dept);
            e.setUp(up);

            EnseignantDTO dto = service.mapEnseignantToDTO(e);

            assertThat(dto.getDeptLibelle()).isEqualTo("Informatique");
            assertThat(dto.getUpLibelle()).isEqualTo("UP Info");
        }
    }

    // ─── mapSeanceToDTO – additional fields ────────────────────────────

    @Nested
    @DisplayName("mapSeanceToDTO - champs additionnels")
    class MapSeanceToDTOFields {

        @Test
        @DisplayName("mappe tous les champs de la séance y compris methodes, contenu, etc.")
        void shouldMapAllFields() {
            SeanceFormation s = new SeanceFormation();
            s.setIdSeance(42L);
            s.setDateSeance(LocalDate.of(2025, Month.JULY, 1));
            s.setHeureDebut(LocalTime.of(9, 0));
            s.setHeureFin(LocalTime.of(12, 0));
            s.setSalle("A101");
            s.setOnlineMeetingUrl("https://meet.example.com/abc");
            s.setContenus("Contenu de test");
            s.setMethodes("Méthodes de test");
            s.setTypeSeance(TypeSeanceEnum.THEORIQUE);
            s.setDureePratique(4f);
            s.setDureeTheorique(8f);
            s.setAnimateurs(null);
            s.setParticipants(null);

            SeanceDTO dto = service.mapSeanceToDTO(s);

            assertThat(dto.getIdSeance()).isEqualTo(42L);
            assertThat(dto.getSalle()).isEqualTo("A101");
            assertThat(dto.getOnlineMeetingUrl()).isEqualTo("https://meet.example.com/abc");
            assertThat(dto.getContenus()).isEqualTo("Contenu de test");
            assertThat(dto.getMethodes()).isEqualTo("Méthodes de test");
            assertThat(dto.getTypeSeance()).isEqualTo(TypeSeanceEnum.THEORIQUE);
            assertThat(dto.getDureePratique()).isEqualTo(4);
            assertThat(dto.getDureeTheorique()).isEqualTo(8);
        }

        @Test
        @DisplayName("mappe animateurs et participants avec liste vide")
        void shouldHandleEmptyLists() {
            SeanceFormation s = new SeanceFormation();
            s.setIdSeance(1L);
            s.setAnimateurs(new ArrayList<>());
            s.setParticipants(new ArrayList<>());

            SeanceDTO dto = service.mapSeanceToDTO(s);

            assertThat(dto.getAnimateurs()).isEmpty();
            assertThat(dto.getParticipants()).isEmpty();
        }
    }

    // ─── listerInscriptionsParFormation pageable – not found ───────────

    @Nested
    @DisplayName("listerInscriptionsParFormation(Long, Pageable) - formation introuvable")
    class ListerInscriptionsParFormationPageableNotFound {

        @Test
        @DisplayName("lève exception quand formation introuvable")
        void shouldThrowWhenFormationNotFound() {
            when(formationRepo.findById(999L)).thenReturn(Optional.empty());

            Pageable pageable = PageRequest.of(0, 10);
            assertThatThrownBy(() -> service.listerInscriptionsParFormation(999L, pageable))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }
    }

    // ─── mapInscriptionToDTO direct ────────────────────────────────────

    @Nested
    @DisplayName("mapInscriptionToDTO(Inscription)")
    class MapInscriptionToDTO {

        @Test
        @DisplayName("mappe tous les champs de l'inscription")
        void shouldMapAllFields() {
            Formation f = createFormation(1L, true, true);
            Enseignant e = createEnseignant("E1", null);
            Inscription ins = createInscription(10L, f, e, EtatInscription.APPROVED);
            ins.setMotif("Motif test");
            ins.setDateTraitement(java.time.OffsetDateTime.now());

            when(formationMapper.toResponseDTO(f)).thenReturn(new FormationResponseDTO());

            InscriptionDTO dto = service.mapInscriptionToDTO(ins);

            assertThat(dto.getId()).isEqualTo(10L);
            assertThat(dto.getEtat()).isEqualTo("APPROVED");
            assertThat(dto.getMotif()).isEqualTo("Motif test");
            assertThat(dto.getDateTraitement()).isNotNull();
            assertThat(dto.getFormation()).isNotNull();
            assertThat(dto.getEnseignant()).isNotNull();
        }
    }
}
