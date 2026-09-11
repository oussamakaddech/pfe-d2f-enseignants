package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.messaging.EvaluationPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowService - Tests unitaires")
class FormationWorkflowServiceTest {

    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceFormationRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private DeptRepository departementRepository;
    @Mock private UpRepository upRepository;
    @Mock private EvaluationPublisher evaluationPublisher;
    @Mock private OutlookCalendarService outlookCalendarService;
    @Mock private OutlookMailService outlookMailService;
    @Mock private PresenceRepository presenceRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private FormationWorkflowServiceHelper helper;
    // Vrai mapper (pas de mock) : le service délègue le mapping entité→DTO à
    // FormationMapper. Un mock renvoyant un DTO vide casserait les assertions
    // sur les champs mappés (titre, id…). FormationMapper est sans dépendance.
    @org.mockito.Spy private FormationMapper formationMapper = new FormationMapper();

    @InjectMocks
    private FormationWorkflowService formationWorkflowService;

    /** Utilisateur à portée globale : contourne le contrôle row-level présences. */
    private static final CurrentUser ADMIN_USER =
            new CurrentUser("admin", "1", "admin@esprit.tn", Set.of("ADMIN"));

    private FormationWorkflowRequest request;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(formationWorkflowService, "formationMapper", formationMapper);
        request = new FormationWorkflowRequest();
        request.setTitreFormation("Formation Test");
        request.setTypeBesoin("PROJET");
        
        request.setDateDebut(LocalDate.of(2026, 1, 1));
        request.setDateFin(LocalDate.of(2026, 12, 31));
        
        request.setTypeFormation(TypeFormation.INTERNE);
        request.setObjectifs("Test Objectifs");
        request.setSeances(new ArrayList<>());
    }

    @Test
    @DisplayName("createFormationWorkflow - Création avec séances et succès")
    void shouldCreateFormationWithSeances() {
        request.setParticipantsIds(List.of("P1"));
        request.setSeances(List.of(createSeanceRequest("2026-10-10", "09:00", "11:00")));
        
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(new Enseignant()));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> {
            Formation f = inv.getArgument(0);
            if (f.getIdFormation() == null) f.setIdFormation(1L);
            if (f.getEtatFormation() == null) f.setEtatFormation(EtatFormation.ENREGISTRE);
            return f;
        });
        lenient().when(seanceFormationRepository.existsSeanceConflict(any(), any(), any(), any())).thenReturn(false);
        lenient().when(helper.parseTime(anyString())).thenReturn(LocalTime.MIDNIGHT);

        Formation result = formationWorkflowService.createFormationWorkflow(request);

        assertThat(result).isNotNull();
        verify(seanceFormationRepository).saveAll(anyList());
        verify(presenceRepository).saveAll(anyList());
        verify(evaluationPublisher).sendCreate(any());
        verify(outlookMailService, atLeastOnce()).sendMail(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("createFormationWorkflow - Échec si conflit de séance")
    void shouldFailWhenSeanceConflict() {
        request.setParticipantsIds(List.of("P1"));
        request.setSeances(List.of(createSeanceRequest("2026-10-10", "09:00", "11:00")));
        
        lenient().when(formationRepository.save(any())).thenReturn(new Formation());
        lenient().when(seanceFormationRepository.existsSeanceConflict(any(), any(), any(), any())).thenReturn(true);
        lenient().when(seanceFormationRepository.findByParticipantAndDate(anyString(), any())).thenReturn(List.of(new SeanceFormation()));
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(new Enseignant()));
        lenient().when(helper.parseTime(anyString())).thenReturn(LocalTime.MIDNIGHT);
        
        doThrow(new IllegalStateException("Conflit")).when(helper)
                .createSeancesForFormation(any(), any(), any());

        assertThrows(IllegalStateException.class, () -> formationWorkflowService.createFormationWorkflow(request));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour et changement d'état")
    void shouldUpdateFormationAndChangeStatus() {
        Formation existing = new Formation();
        existing.setIdFormation(1L);
        existing.setEtatFormation(EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());

        request.setEtatFormation(EtatFormation.VISIBLE);
        
        Enseignant e = new Enseignant();
        e.setId("E1");
        e.setMail("test@esprit.tn");

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);
        lenient().when(enseignantRepository.findAll()).thenReturn(List.of(e));

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result.getEtatFormation()).isEqualTo(EtatFormation.VISIBLE);
        verify(outlookMailService, atLeastOnce()).sendMail(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("deleteFormationWorkflow - Suppression")
    void shouldDeleteFormation() {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setSeances(new ArrayList<>());
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        
        formationWorkflowService.deleteFormationWorkflow(1L);
        
        verify(formationRepository).delete(formation);
    }

    @Test
    @DisplayName("deleteFormationWorkflow - Continue même si le nettoyage échoue")
    void shouldDeleteFormationEvenIfCleanupFails() {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setSeances(new ArrayList<>());

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        FormationWorkflowService serviceSpy = spy(formationWorkflowService);
        doThrow(new RuntimeException("cleanup failed")).when(serviceSpy).removeFormationCalendar(formation);

        serviceSpy.deleteFormationWorkflow(1L);

        verify(formationRepository).delete(formation);
    }

    @Test
    @DisplayName("getFormationWorkflowById - Succès")
    void shouldGetFormationWorkflowById() {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Test Get");
        formation.setCoutFormation(0.0f);
        formation.setCoutHebergement(0.0f);
        formation.setCoutRepas(0.0f);
        formation.setCoutTransport(0.0f);
        formation.setChargeHoraireGlobal(0);
        formation.setOuverte(false);
        formation.setInscriptionsOuvertes(false);
        formation.setCertifGenerated(false);
        
        SeanceFormation sf = new SeanceFormation();
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        formation.setSeances(List.of(sf));
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));

        FormationResponseDTO dto = formationWorkflowService.getFormationWorkflowById(1L);

        assertThat(dto).isNotNull();
        assertThat(dto.getTitreFormation()).isEqualTo("Test Get");
    }

    @Test
    @DisplayName("getAllFormationWorkflows - Succès")
    void shouldGetAllFormationWorkflows() {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Test GetAll");
        formation.setFormationCompetences(new ArrayList<>());
        formation.setInscriptions(new ArrayList<>());
        formation.setCoutFormation(0.0f);
        formation.setCoutHebergement(0.0f);
        formation.setCoutRepas(0.0f);
        formation.setCoutTransport(0.0f);
        formation.setChargeHoraireGlobal(0);
        formation.setOuverte(false);
        formation.setInscriptionsOuvertes(false);
        formation.setCertifGenerated(false);

        SeanceFormation sf = new SeanceFormation();
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        formation.setSeances(List.of(sf));
        
        lenient().when(formationRepository.findAll()).thenReturn(List.of(formation));

        List<FormationResponseDTO> list = formationWorkflowService.getAllFormationWorkflows();

        assertThat(list).isNotEmpty();
        assertThat(list.get(0).getTitreFormation()).isEqualTo("Test GetAll");
    }

    @Test
    @DisplayName("getFormationsByAnimateurEmail - Succès")
    void shouldGetFormationsByAnimateurEmail() {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Test Email");
        formation.setEtatFormation(EtatFormation.EN_COURS);
        formation.setCoutFormation(0.0f);
        formation.setCoutHebergement(0.0f);
        formation.setCoutRepas(0.0f);
        formation.setCoutTransport(0.0f);
        formation.setChargeHoraireGlobal(0);
        formation.setOuverte(false);
        formation.setInscriptionsOuvertes(false);
        formation.setCertifGenerated(false);
        
        SeanceFormation sf = new SeanceFormation();
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        formation.setSeances(List.of(sf));
        
        lenient().when(formationRepository.findDistinctBySeancesAnimateursMail("test@esprit.tn")).thenReturn(List.of(formation));

        List<FormationResponseDTO> list = formationWorkflowService.getFormationsByAnimateurEmail("test@esprit.tn");

        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("updatePresence - Succès")
    void shouldUpdatePresence() {
        Presence presence = new Presence();
        presence.setIdParticipation(1L);
        lenient().when(presenceRepository.findById(1L)).thenReturn(Optional.of(presence));
        
        formationWorkflowService.updatePresence(1L, true, "OK", ADMIN_USER);
        
        assertThat(presence.isPresent()).isTrue();
        assertThat(presence.getCommentaire()).isEqualTo("OK");
        verify(presenceRepository).save(presence);
    }

    @Test
    @DisplayName("getPresencesBySeance - Succès")
    void shouldGetPresencesBySeance() {
        SeanceFormation seance = new SeanceFormation();
        Presence p = new Presence();
        p.setEnseignant(new Enseignant());
        seance.setPresences(List.of(p));
        
        lenient().when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(seance));
        
        List<PresenceDTO> list = formationWorkflowService.getPresencesBySeance(1L);
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsAchevees - Succès")
    void shouldGetFormationsAchevees() {
        Formation f = createFullFormation();
        f.setEtatFormation(EtatFormation.ACHEVE);
        lenient().when(formationRepository.findByEtatFormation(EtatFormation.ACHEVE)).thenReturn(List.of(f));
        
        List<FormationResponseDTO> list = formationWorkflowService.getFormationsAchevees();
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("getAllFormationsWithDocuments - Succès")
    void shouldGetAllFormationsWithDocuments() {
        Formation f = createFullFormation();
        f.setIdFormation(1L);
        f.setEtatFormation(EtatFormation.ENREGISTRE);
        lenient().when(formationRepository.findAll()).thenReturn(List.of(f));
        lenient().when(documentRepository.findByFormation_IdFormation(1L)).thenReturn(new ArrayList<>());
        
        List<FormationWithDocumentsDTO> list = formationWorkflowService.getAllFormationsWithDocuments();
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsForCalendar - Succès")
    void shouldGetFormationsForCalendar() {
        lenient().when(formationRepository.findDistinctBySeances_Animateurs_Id("E1")).thenReturn(new ArrayList<>());
        lenient().when(formationRepository.findDistinctBySeances_Participants_Id("E1")).thenReturn(new ArrayList<>());
        
        FormationsByRoleDTO result = formationWorkflowService.getFormationsForCalendar("E1");
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("setInscriptionsOuvertes - Succès")
    void shouldSetInscriptionsOuvertes() {
        Formation f = createFullFormation();
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        lenient().when(formationRepository.save(any())).thenReturn(f);
        
        formationWorkflowService.setInscriptionsOuvertes(1L, true);
        assertThat(f.isInscriptionsOuvertes()).isTrue();
    }

    @Test
    @DisplayName("getFormationsVisibles - Succès")
    void shouldGetFormationsVisibles() {
        Formation f = createFullFormation();
        f.setEtatFormation(EtatFormation.VISIBLE);
        lenient().when(formationRepository.findAll()).thenReturn(List.of(f));
        
        List<FormationResponseDTO> list = formationWorkflowService.getFormationsVisibles();
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsParUp - Succès")
    void shouldGetFormationsParUp() {
        Formation f = createFullFormation();
        f.setEtatFormation(EtatFormation.VISIBLE);
        lenient().when(formationRepository.findByUp_Id("UP1")).thenReturn(List.of(f));
        
        List<FormationResponseDTO> list = formationWorkflowService.getFormationsParUp("UP1");
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsParDepartement - Succès")
    void shouldGetFormationsParDepartement() {
        Formation f = createFullFormation();
        lenient().when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));
        
        List<FormationResponseDTO> list = formationWorkflowService.getFormationsParDepartement("D1");
        assertThat(list).isNotEmpty();
    }

    private CurrentUser cupUser() {
        return new CurrentUser("fbenhassen", "u1", "f.benhassen@esprit.tn", java.util.Set.of("CUP"));
    }

    private CurrentUser chefUser() {
        return new CurrentUser("sbouazizi", "u2", "s.bouazizi@esprit.tn",
                java.util.Set.of("CHEF_DEPARTEMENT"));
    }

    private CurrentUser adminUser() {
        return new CurrentUser("admin", "u3", "admin@d2f.tn", java.util.Set.of("ADMIN"));
    }

    private Enseignant enseignantWith(Up up, Dept dept) {
        Enseignant e = new Enseignant();
        e.setId("ENS001");
        e.setMail("x@esprit.tn");
        e.setUp(up);
        e.setDept(dept);
        return e;
    }

    @Test
    @DisplayName("getMesFormationsPilote - CUP : formations de son UP uniquement")
    void shouldGetMesFormationsPilote_cupScopedToUp() {
        Formation f = createFullFormation();
        Up up = new Up();
        up.setId("UP1");
        Enseignant ens = enseignantWith(up, null);
        when(enseignantRepository.findByMailIgnoreCase("f.benhassen@esprit.tn"))
                .thenReturn(Optional.of(ens));
        when(formationRepository.findByUp_Id("UP1")).thenReturn(List.of(f));

        List<FormationResponseDTO> list = formationWorkflowService.getMesFormationsPilote(cupUser());

        assertThat(list).isNotEmpty();
        verify(formationRepository).findByUp_Id("UP1");
        verify(formationRepository, never()).findAll();
    }

    @Test
    @DisplayName("getMesFormationsPilote - Chef : formations de son département uniquement")
    void shouldGetMesFormationsPilote_chefScopedToDept() {
        Formation f = createFullFormation();
        Dept dept = new Dept();
        dept.setId("D1");
        Enseignant ens = enseignantWith(null, dept);
        when(enseignantRepository.findByMailIgnoreCase("s.bouazizi@esprit.tn"))
                .thenReturn(Optional.of(ens));
        when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));

        List<FormationResponseDTO> list = formationWorkflowService.getMesFormationsPilote(chefUser());

        assertThat(list).isNotEmpty();
        verify(formationRepository).findByDepartement_Id("D1");
        verify(formationRepository, never()).findAll();
    }

    @Test
    @DisplayName("getMesFormationsPilote - Admin : vue complète")
    void shouldGetMesFormationsPilote_adminSeesAll() {
        Formation f = createFullFormation();
        when(formationRepository.findAll()).thenReturn(List.of(f));

        List<FormationResponseDTO> list = formationWorkflowService.getMesFormationsPilote(adminUser());

        assertThat(list).isNotEmpty();
        verify(formationRepository).findAll();
        verifyNoInteractions(enseignantRepository);
    }

    @Test
    @DisplayName("getMesFormationsPilote - profil enseignant introuvable : erreur explicite")
    void shouldGetMesFormationsPilote_unknownProfile() {
        when(enseignantRepository.findByMailIgnoreCase("f.benhassen@esprit.tn"))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> formationWorkflowService.getMesFormationsPilote(cupUser()));
        assertThat(ex.getMessage()).contains("Profil enseignant introuvable");
    }

    @Test
    @DisplayName("getMesFormationsPilote - CUP sans UP rattachée : erreur explicite")
    void shouldGetMesFormationsPilote_cupWithoutUp() {
        Enseignant ens = enseignantWith(null, null);
        when(enseignantRepository.findByMailIgnoreCase("f.benhassen@esprit.tn"))
                .thenReturn(Optional.of(ens));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> formationWorkflowService.getMesFormationsPilote(cupUser()));
        assertThat(ex.getMessage()).contains("Aucune UP rattachée");
    }

    @Test
    @DisplayName("synchronizeFormationCalendar - Succès")
    void shouldSynchronizeFormationCalendar() {
        Formation f = createFullFormation();
        f.setIdFormation(1L);
        f.setTitreFormation("Java");
        
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(1L);
        sf.setCalendarEventId("OLD_ID");
        sf.setDateSeance(LocalDate.now());
        sf.setHeureDebut(LocalTime.of(9, 0));
        sf.setHeureFin(LocalTime.of(11, 0));
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        
        f.setSeances(List.of(sf));
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        lenient().when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        lenient().when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("NEW_ID", "http://teams"));
        
        formationWorkflowService.synchronizeFormationCalendar(f);
        
        verify(outlookCalendarService).updateEventInCalendarWithTeamsUrl(any());
        verify(outlookMailService, never()).sendMail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour séances (ajout, modif, suppression)")
    void shouldUpdateSeancesInWorkflow() {
        Formation existing = createFullFormation();
        existing.setIdFormation(1L);
        
        SeanceFormation s1 = new SeanceFormation();
        s1.setIdSeance(10L);
        s1.setFormation(existing);
        existing.setSeances(new ArrayList<>(List.of(s1)));
        
        // Request: Update S10, Add S11
        FormationWorkflowRequest.SeanceRequest srUpdate = createSeanceRequest("2026-10-10", "09:00", "11:00");
        srUpdate.setIdSeance(10L);
        srUpdate.setSalle("S1");
        
        FormationWorkflowRequest.SeanceRequest srNew = createSeanceRequest("2026-10-11", "09:00", "11:00");
        srNew.setSalle("S2");
        
        request.setSeances(List.of(srUpdate, srNew));
        request.setParticipantsIds(List.of("P1"));
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);
        lenient().when(enseignantRepository.findAllById(anySet())).thenReturn(new ArrayList<>());
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(new Enseignant()));
        lenient().when(helper.parseTime(anyString())).thenReturn(LocalTime.MIDNIGHT);

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result.getSeances()).hasSize(2);
        verify(outlookCalendarService, never()).deleteEventInCalendar(anyString(), anyString());
    }

    @Test
    @DisplayName("updateFormationWorkflow - Suppression séance (orphan removal)")
    void shouldRemoveOrphanSeances() {
        Formation existing = createFullFormation();
        existing.setIdFormation(1L);
        
        SeanceFormation s1 = new SeanceFormation();
        s1.setIdSeance(10L);
        s1.setCalendarEventId("EV1");
        s1.setFormation(existing);
        existing.setSeances(new ArrayList<>(List.of(s1)));
        
        request.setSeances(new ArrayList<>()); // Empty seances -> S10 is orphan
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);

        formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(existing.getSeances()).isEmpty();
        verify(outlookCalendarService).deleteEventInCalendar(any(), eq("EV1"));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Transition vers ANNULE")
    void shouldHandleTransitionToAnnule() {
        Formation existing = createFullFormation();
        existing.setIdFormation(1L);
        existing.setEtatFormation(EtatFormation.PLANIFIE);
        
        SeanceFormation s1 = new SeanceFormation();
        s1.setIdSeance(10L);
        s1.setFormation(existing);
        existing.setSeances(new ArrayList<>(List.of(s1)));

        request.setEtatFormation(EtatFormation.ANNULE);
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);

        formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(existing.getEtatFormation()).isEqualTo(EtatFormation.ANNULE);
        verify(outlookMailService, atLeastOnce()).sendMail(any(), contains("Annulation"), anyString());
    }

    @Test
    @DisplayName("updateFormationWorkflow - Échec si séance inconnue")
    void shouldFailWhenUpdatingUnknownSeance() {
        Formation existing = createFullFormation();
        existing.setIdFormation(1L);
        
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        sr.setIdSeance(999L);
        request.setSeances(List.of(sr));
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThrows(IllegalStateException.class, () -> formationWorkflowService.updateFormationWorkflow(1L, request));
    }

    @Test
    @DisplayName("publishEvaluationBatch - Ne doit pas planter si le broker échoue")
    void shouldNotFailWhenBrokerDown() {
        request.setParticipantsIds(List.of("P1"));
        request.setSeances(List.of(createSeanceRequest("2026-10-10", "09:00", "11:00")));
        
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("Broker Down")).when(evaluationPublisher).sendCreate(any());

        assertDoesNotThrow(() -> formationWorkflowService.createFormationWorkflow(request));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Parsing PeriodCode (valide et invalide)")
    void shouldHandlePeriodCodeParsing() {
        Formation existing = createFullFormation();
        request.setPeriodCode("WINTER"); // Valid

        lenient().when(formationRepository.findById(anyLong())).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        formationWorkflowService.updateFormationWorkflow(1L, request);
        assertThat(existing.getPeriodCode()).isEqualTo(PeriodCode.WINTER);

        request.setPeriodCode("INVALID");
        formationWorkflowService.updateFormationWorkflow(1L, request);
        assertThat(existing.getPeriodCode()).isEqualTo(PeriodCode.OTHER);
    }

    @Test
    @DisplayName("syncPresencesForSeance - Échec si enseignant introuvable")
    void shouldFailWhenEnseignantNotFoundDuringSync() {
        Formation existing = createFullFormation();
        existing.setIdFormation(1L);
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        existing.setSeances(new ArrayList<>(List.of(sf)));
        
        request.setParticipantsIds(List.of("UNKNOWN"));
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        sr.setIdSeance(10L);
        request.setSeances(List.of(sr));
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(presenceRepository.findBySeanceFormation_IdSeance(anyLong())).thenReturn(new ArrayList<>());
        lenient().when(enseignantRepository.findById("UNKNOWN")).thenReturn(Optional.empty());
        lenient().when(helper.parseTime(any())).thenReturn(LocalTime.MIDNIGHT);

        assertThrows(IllegalArgumentException.class, () -> formationWorkflowService.updateFormationWorkflow(1L, request));
    }

    private Formation createFullFormation() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Formation Test");
        f.setCoutFormation(0.0f);
        f.setCoutHebergement(0.0f);
        f.setCoutRepas(0.0f);
        f.setCoutTransport(0.0f);
        f.setChargeHoraireGlobal(0);
        f.setOuverte(false);
        f.setInscriptionsOuvertes(false);
        f.setCertifGenerated(false);
        f.setEtatFormation(EtatFormation.ENREGISTRE);
        f.setSeances(new ArrayList<>());
        return f;
    }

    private FormationWorkflowRequest.SeanceRequest createSeanceRequest(String date, String debut, String fin) {
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        sr.setDateSeance(LocalDate.parse(date));
        sr.setHeureDebut(debut);
        sr.setHeureFin(fin);
        return sr;
    }
}
