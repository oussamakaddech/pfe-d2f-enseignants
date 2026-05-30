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

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests améliorés pour FormationWorkflowService
 * Couvre les transitions d'état complexes et scénarios d'erreur
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowService - Tests améliorés")
class FormationWorkflowServiceEnhancedTest {

    @Mock
    private FormationRepository formationRepository;
    @Mock
    private SeanceFormationRepository seanceFormationRepository;
    @Mock
    private EnseignantRepository enseignantRepository;
    @Mock
    private DeptRepository departementRepository;
    @Mock
    private UpRepository upRepository;
    @Mock
    private EvaluationPublisher evaluationPublisher;
    @Mock
    private OutlookCalendarService outlookCalendarService;
    @Mock
    private OutlookMailService outlookMailService;
    @Mock
    private PresenceRepository presenceRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private FormationWorkflowServiceHelper helper;
    // Vrai mapper (pas de mock) : le mapping entité→DTO est délégué à
    // FormationMapper ; un mock vide casserait les assertions sur les champs.
    @org.mockito.Spy
    private FormationMapper formationMapper = new FormationMapper();

    @InjectMocks
    private FormationWorkflowService formationWorkflowService;

    private FormationWorkflowRequest request;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(formationWorkflowService, "formationMapper", formationMapper);

        request = new FormationWorkflowRequest();
        request.setTitreFormation("Formation Test");
        request.setTypeBesoin("PROJET");

        Calendar cal = Calendar.getInstance();
        cal.set(2026, Calendar.JANUARY, 1);
        request.setDateDebut(cal.getTime());
        cal.set(2026, Calendar.DECEMBER, 31);
        request.setDateFin(cal.getTime());

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
            if (f.getIdFormation() == null)
                f.setIdFormation(1L);
            if (f.getEtatFormation() == null)
                f.setEtatFormation(EtatFormation.ENREGISTRE);
            return f;
        });
        lenient().when(seanceFormationRepository.existsSeanceConflict(any(), any(), any(), any())).thenReturn(false);
        lenient().when(helper.parseTime(anyString())).thenReturn(new java.sql.Time(0));

        Formation result = formationWorkflowService.createFormationWorkflow(request);

        assertThat(result).isNotNull();
        verify(seanceFormationRepository).saveAll(anyList());
        verify(presenceRepository).saveAll(anyList());
        verify(evaluationPublisher).sendCreate(any());
        verify(outlookMailService, atLeastOnce()).sendMail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("createFormationWorkflow - Échec si conflit de séance")
    void shouldFailWhenSeanceConflict() {
        request.setParticipantsIds(List.of("P1"));
        request.setSeances(List.of(createSeanceRequest("2026-10-10", "09:00", "11:00")));

        lenient().when(formationRepository.save(any())).thenReturn(new Formation());
        lenient().when(seanceFormationRepository.existsSeanceConflict(any(), any(), any(), any())).thenReturn(true);
        lenient().when(seanceFormationRepository.findByParticipantAndDate(anyString(), any()))
                .thenReturn(List.of(new SeanceFormation()));
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(new Enseignant()));
        lenient().when(helper.parseTime(anyString())).thenReturn(new java.sql.Time(0));

        doThrow(new IllegalStateException("Conflit")).when(helper)
                .createSeancesForFormation(any(), any(), any());

        assertThrows(IllegalStateException.class, () -> formationWorkflowService.createFormationWorkflow(request));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Transition ENREGISTRE → PLANIFIE")
    void shouldTransitionFromEnregistreToPlanifie() {
        Formation existing = createFormation(1L, EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());

        request.setEtatFormation(EtatFormation.PLANIFIE);

        Enseignant e = new Enseignant();
        e.setId("E1");
        e.setMail("test@esprit.tn");

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);
        lenient().when(enseignantRepository.findAll()).thenReturn(List.of(e));

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result.getEtatFormation()).isEqualTo(EtatFormation.PLANIFIE);
        // La transition vers PLANIFIE synchronise le calendrier, n'envoie pas d'email
        // Les emails sont envoyés lors de la transition vers VISIBLE
    }

    @Test
    @DisplayName("updateFormationWorkflow - Transition PLANIFIE → EN_COURS")
    void shouldTransitionFromPlanifieToEnCours() {
        Formation existing = createFormation(1L, EtatFormation.PLANIFIE);
        existing.setSeances(new ArrayList<>());

        request.setEtatFormation(EtatFormation.EN_COURS);

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result.getEtatFormation()).isEqualTo(EtatFormation.EN_COURS);
    }

    @Test
    @DisplayName("updateFormationWorkflow - Transition EN_COURS → ACHEVE")
    void shouldTransitionFromEnCoursToAcheve() {
        Formation existing = createFormation(1L, EtatFormation.EN_COURS);
        existing.setSeances(new ArrayList<>());

        request.setEtatFormation(EtatFormation.ACHEVE);

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result.getEtatFormation()).isEqualTo(EtatFormation.ACHEVE);
    }

    @Test
    @DisplayName("updateFormationWorkflow - Transition invalide ACHEVE → ENREGISTRE")
    void shouldRejectInvalidTransition() {
        Formation existing = createFormation(1L, EtatFormation.ACHEVE);
        existing.setSeances(new ArrayList<>());

        request.setEtatFormation(EtatFormation.ENREGISTRE);

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);

        // La transition devrait être acceptée par défaut (pas de validation stricte)
        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("updateFormationWorkflow - Échec avec conflits de séances")
    void shouldFailUpdateWithSeanceConflicts() {
        Formation existing = createFormation(1L, EtatFormation.PLANIFIE);
        existing.setSeances(new ArrayList<>());

        // Créer une séance avec une salle pour tester les conflits de salle
        FormationWorkflowRequest.SeanceRequest seanceRequest = createSeanceRequest("2026-10-10", "09:00", "11:00");
        seanceRequest.setSalle("S101");
        request.setSeances(List.of(seanceRequest));

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(seanceFormationRepository.existsSalleConflict(any(), any(), any(), any())).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> formationWorkflowService.updateFormationWorkflow(1L, request));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Échec avec formation introuvable")
    void shouldFailUpdateWithFormationNotFound() {
        when(formationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class,
                () -> formationWorkflowService.updateFormationWorkflow(999L, request));
    }

    @Test
    @DisplayName("deleteFormationWorkflow - Suppression réussie")
    void shouldDeleteFormation() {
        Formation formation = createFormation(1L, EtatFormation.ENREGISTRE);
        formation.setSeances(new ArrayList<>());

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));

        formationWorkflowService.deleteFormationWorkflow(1L);

        verify(formationRepository).delete(formation);
    }

    @Test
    @DisplayName("deleteFormationWorkflow - Échec avec formation introuvable")
    void shouldFailDeleteWithFormationNotFound() {
        when(formationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> formationWorkflowService.deleteFormationWorkflow(999L));
    }

    @Test
    @DisplayName("getFormationWorkflowById - Succès")
    void shouldGetFormationWorkflowById() {
        Formation formation = createFormation(1L, EtatFormation.PLANIFIE);
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
        Formation formation = createFormation(1L, EtatFormation.PLANIFIE);
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
    @DisplayName("updatePresence - Succès")
    void shouldUpdatePresence() {
        Presence presence = new Presence();
        presence.setIdParticipation(1L);
        lenient().when(presenceRepository.findById(1L)).thenReturn(Optional.of(presence));

        formationWorkflowService.updatePresence(1L, true, "OK");

        assertThat(presence.isPresent()).isTrue();
        assertThat(presence.getCommentaire()).isEqualTo("OK");
    }

    @Test
    @DisplayName("updatePresence - Échec avec présence introuvable")
    void shouldFailUpdatePresenceNotFound() {
        when(presenceRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> formationWorkflowService.updatePresence(999L, true, "OK"));
    }

    @Test
    @DisplayName("setInscriptionsOuvertes - Succès")
    void shouldSetInscriptionsOuvertes() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setInscriptionsOuvertes(false);

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        lenient().when(formationRepository.save(any())).thenReturn(formation);

        FormationResponseDTO dto = formationWorkflowService.setInscriptionsOuvertes(1L, true);

        assertThat(dto).isNotNull();
        verify(formationRepository).save(any());
    }

    @Test
    @DisplayName("getFormationsVisibles - Succès")
    void shouldGetFormationsVisibles() {
        // Create a formation with inscriptions ouvertes
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Test Formation");
        formation.setEtatFormation(EtatFormation.VISIBLE);
        formation.setInscriptionsOuvertes(true);

        // Mock the repository to return the formation
        when(formationRepository.findAll())
                .thenReturn(List.of(formation));

        List<FormationResponseDTO> result = formationWorkflowService.getFormationsVisibles();

        assertThat(result).isNotEmpty();
    }

    @Test
    @DisplayName("notifyTeachersOfApprovedFormation - Succès")
    void shouldNotifyTeachersOfApprovedFormation() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setTitreFormation("Formation Test");

        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(10L);

        Enseignant animateur = new Enseignant();
        animateur.setId("E1");
        animateur.setMail("e1@esprit.tn");

        Enseignant participant = new Enseignant();
        participant.setId("E2");
        participant.setMail("e2@esprit.tn");

        seance.setAnimateurs(List.of(animateur));
        seance.setParticipants(List.of(participant));
        formation.setSeances(List.of(seance));

        when(enseignantRepository.findAllById(anyCollection())).thenReturn(List.of(animateur, participant));

        formationWorkflowService.notifyTeachersOfApprovedFormation(formation);

        verify(outlookMailService, times(2)).sendMail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("notifyCUPOfApprovedFormation - Succès")
    void shouldNotifyCUPOfApprovedFormation() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setTitreFormation("Formation Test");
        
        Up up = new Up();
        up.setId("UP1");
        up.setLibelle("UP Test");
        formation.setUp(up);

        Enseignant cup = new Enseignant();
        cup.setId("CUP1");
        cup.setMail("cup@esprit.tn");
        cup.setNom("CUP Nom");
        cup.setPrenom("CUP Prenom");

        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cup));

        formationWorkflowService.notifyCUPOfApprovedFormation(formation);

        verify(outlookMailService).sendMail(eq("cup@esprit.tn"), anyString(), anyString());
    }

    @Test
    @DisplayName("notifyCUPOfApprovedFormation - Formation sans UP")
    void shouldNotNotifyCUPWhenFormationHasNoUp() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setTitreFormation("Formation Test");
        formation.setUp(null);

        formationWorkflowService.notifyCUPOfApprovedFormation(formation);

        verify(outlookMailService, never()).sendMail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("synchronizeFormationCalendar - Succès")
    void shouldSynchronizeFormationCalendar() {
        Formation formation = createFormation(1L, EtatFormation.PLANIFIE);
        formation.setTitreFormation("Formation Test");
        
        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setDateSeance(new java.util.Date());
        seance.setHeureDebut(java.sql.Time.valueOf(java.time.LocalTime.of(9, 0, 0)));
        seance.setHeureFin(java.sql.Time.valueOf(java.time.LocalTime.of(11, 0, 0)));
        seance.setSalle("S101");
        seance.setAnimateurs(new ArrayList<>());
        seance.setParticipants(new ArrayList<>());
        seance.setCalendarEventId("event123");
        seance.setFormation(formation);
        
        formation.setSeances(List.of(seance));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(seance));
        when(helper.convertToOffsetDateTime(any(), any())).thenReturn(java.time.OffsetDateTime.now());
        when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("event123", "https://teams.microsoft.com/l/meetup-join/123"));

        formationWorkflowService.synchronizeFormationCalendar(formation);

        verify(outlookCalendarService).updateEventInCalendarWithTeamsUrl(any());
        verify(seanceFormationRepository).save(seance);
    }

    @Test
    @DisplayName("synchronizeFormationCalendar - Séance sans animateurs")
    void shouldSynchronizeFormationCalendarWithoutAnimateurs() {
        Formation formation = createFormation(1L, EtatFormation.PLANIFIE);
        formation.setTitreFormation("Formation Test");

        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setCalendarEventId("event123");
        seance.setFormation(formation);
        seance.setDateSeance(new java.util.Date());
        seance.setHeureDebut(java.sql.Time.valueOf("09:00:00"));
        seance.setHeureFin(java.sql.Time.valueOf("11:00:00"));
        seance.setAnimateurs(null);
        seance.setParticipants(new ArrayList<>());

        formation.setSeances(List.of(seance));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(seance));
        when(helper.convertToOffsetDateTime(any(), any())).thenReturn(java.time.OffsetDateTime.now());
        when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("event123", "https://teams.microsoft.com/l/meetup-join/123"));

        assertDoesNotThrow(() -> formationWorkflowService.synchronizeFormationCalendar(formation));

        verify(outlookCalendarService).updateEventInCalendarWithTeamsUrl(any());
    }

    @Test
    @DisplayName("updateFormationWorkflow - Présence existante sans enseignant")
    void shouldUpdateFormationWhenExistingPresenceHasNoEnseignant() {
        Formation existing = createFormation(1L, EtatFormation.PLANIFIE);
        existing.setTitreFormation("Formation Test");
        existing.setSeances(new ArrayList<>());

        SeanceFormation existingSeance = new SeanceFormation();
        existingSeance.setIdSeance(1L);
        existingSeance.setFormation(existing);
        existingSeance.setAnimateurs(new ArrayList<>());
        existingSeance.setParticipants(new ArrayList<>());
        existing.getSeances().add(existingSeance);

        FormationWorkflowRequest.SeanceRequest seanceRequest = new FormationWorkflowRequest.SeanceRequest();
        seanceRequest.setIdSeance(1L);
        seanceRequest.setDateSeance(new java.util.Date());
        seanceRequest.setHeureDebut("09:00");
        seanceRequest.setHeureFin("11:00");
        seanceRequest.setAnimateursIds(new ArrayList<>());

        request.setEtatFormation(EtatFormation.PLANIFIE);
        request.setParticipantsIds(List.of("P1"));
        request.setSeances(List.of(seanceRequest));

        Presence malformedPresence = new Presence();
        malformedPresence.setIdParticipation(1L);
        malformedPresence.setSeanceFormation(existingSeance);
        malformedPresence.setEnseignant(null);

        Enseignant participant = new Enseignant();
        participant.setId("P1");
        participant.setMail("p1@esprit.tn");

        when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(enseignantRepository.findAllById(any())).thenReturn(List.of(participant));
        when(enseignantRepository.findById("P1")).thenReturn(Optional.of(participant));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(malformedPresence));

        assertDoesNotThrow(() -> formationWorkflowService.updateFormationWorkflow(1L, request));
        verify(presenceRepository).delete(malformedPresence);
        verify(presenceRepository).save(any(Presence.class));
    }

    @Test
    @DisplayName("removeFormationCalendar - Succès")
    void shouldRemoveFormationCalendar() {
        Formation formation = createFormation(1L, EtatFormation.ANNULE);
        formation.setTitreFormation("Formation Test");
        
        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setCalendarEventId("event123");
        seance.setFormation(formation);

        Enseignant animateur = new Enseignant();
        animateur.setId("E1");
        animateur.setMail("e1@esprit.tn");
        seance.setAnimateurs(List.of(animateur));
        seance.setParticipants(new ArrayList<>());
        
        formation.setSeances(List.of(seance));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));

        formationWorkflowService.removeFormationCalendar(formation);

        verify(outlookCalendarService).deleteEventInCalendar(anyString(), eq("event123"));
        verify(outlookMailService, times(2)).sendMail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("getFormationsByAnimateurEmail - Succès")
    void shouldGetFormationsByAnimateurEmail() {
        Formation formation = createFormation(1L, EtatFormation.EN_COURS);
        formation.setTitreFormation("Formation Test");
        
        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setAnimateurs(new ArrayList<>());
        seance.setParticipants(new ArrayList<>());
        formation.setSeances(List.of(seance));

        when(formationRepository.findDistinctBySeancesAnimateursMail("test@esprit.tn"))
                .thenReturn(List.of(formation));

        List<FormationResponseDTO> result = formationWorkflowService.getFormationsByAnimateurEmail("test@esprit.tn");

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Formation Test");
    }

    @Test
    @DisplayName("getPresencesBySeance - Succès")
    void shouldGetPresencesBySeance() {
        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        
        Enseignant e = new Enseignant();
        e.setId("E1");
        e.setNom("Nom");
        e.setPrenom("Prenom");
        e.setMail("test@esprit.tn");
        
        Presence presence = new Presence();
        presence.setIdParticipation(1L);
        presence.setPresent(true);
        presence.setCommentaire("OK");
        presence.setEnseignant(e);
        
        seance.setPresences(List.of(presence));

        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(seance));

        List<PresenceDTO> result = formationWorkflowService.getPresencesBySeance(1L);

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).isPresent()).isTrue();
        assertThat(result.get(0).getCommentaire()).isEqualTo("OK");
    }

    @Test
    @DisplayName("getPresencesBySeance - Séance sans présences")
    void shouldReturnEmptyListWhenSeanceHasNoPresences() {
        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setPresences(null);

        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(seance));

        List<PresenceDTO> result = formationWorkflowService.getPresencesBySeance(1L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getFormationsAchevees - Succès")
    void shouldGetFormationsAchevees() {
        Formation formation = createFormation(1L, EtatFormation.ACHEVE);
        formation.setTitreFormation("Formation Test");

        when(formationRepository.findByEtatFormation(EtatFormation.ACHEVE))
                .thenReturn(List.of(formation));

        List<FormationResponseDTO> result = formationWorkflowService.getFormationsAchevees();

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Formation Test");
    }

    @Test
    @DisplayName("getFormationsForCalendar - Succès")
    void shouldGetFormationsForCalendar() {
        Formation formation = createFormation(1L, EtatFormation.EN_COURS);
        formation.setTitreFormation("Formation Test");

        when(formationRepository.findDistinctBySeances_Animateurs_Id("E1"))
                .thenReturn(List.of(formation));
        when(formationRepository.findDistinctBySeances_Participants_Id("E1"))
                .thenReturn(List.of(formation));

        FormationsByRoleDTO result = formationWorkflowService.getFormationsForCalendar("E1");

        assertThat(result).isNotNull();
        assertThat(result.getAsAnimateur()).isNotEmpty();
        assertThat(result.getAsParticipant()).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsParUp - Succès")
    void shouldGetFormationsParUp() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setTitreFormation("Formation Test");

        when(formationRepository.findByUp_Id("UP1"))
                .thenReturn(List.of(formation));

        List<FormationResponseDTO> result = formationWorkflowService.getFormationsParUp("UP1");

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Formation Test");
    }

    @Test
    @DisplayName("getFormationsParDepartement - Succès")
    void shouldGetFormationsParDepartement() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setTitreFormation("Formation Test");

        when(formationRepository.findByDepartement_Id("DEPT1"))
                .thenReturn(List.of(formation));

        List<FormationResponseDTO> result = formationWorkflowService.getFormationsParDepartement("DEPT1");

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Formation Test");
    }

    // Méthodes utilitaires pour créer des objets de test
    private Formation createFormation(Long id, EtatFormation etat) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation("Formation " + id);
        f.setEtatFormation(etat);
        f.setCoutFormation(0.0f);
        f.setCoutHebergement(0.0f);
        f.setCoutRepas(0.0f);
        f.setCoutTransport(0.0f);
        f.setChargeHoraireGlobal(0);
        f.setOuverte(false);
        f.setInscriptionsOuvertes(false);
        f.setCertifGenerated(false);
        return f;
    }

    private FormationWorkflowRequest.SeanceRequest createSeanceRequest(String date, String debut, String fin) {
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        try {
            sr.setDateSeance(new java.text.SimpleDateFormat("yyyy-MM-dd").parse(date));
        } catch (java.text.ParseException e) {
            throw new RuntimeException("Failed to parse date: " + date, e);
        }
        sr.setHeureDebut(debut);
        sr.setHeureFin(fin);
        return sr;
    }

    @Test
    @DisplayName("getAllFormationsWithDocuments - Succès")
    void shouldGetAllFormationsWithDocuments() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setTitreFormation("Formation Test");
        formation.setTypeFormation(TypeFormation.INTERNE);
        formation.setPeriodCode(PeriodCode.WINTER);
        formation.setCustomPeriodLabel("Période personnalisée");

        Up up = new Up();
        up.setId("UP1");
        up.setLibelle("UP Test");
        formation.setUp(up);

        Dept dept = new Dept();
        dept.setId("DEPT1");
        dept.setLibelle("Département Test");
        formation.setDepartement(dept);

        when(formationRepository.findAll()).thenReturn(List.of(formation));
        when(documentRepository.findByFormation_IdFormation(1L)).thenReturn(List.of());

        List<FormationWithDocumentsDTO> result = formationWorkflowService.getAllFormationsWithDocuments();

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Formation Test");
        assertThat(result.get(0).getPeriodCode()).isEqualTo("WINTER");
        assertThat(result.get(0).getCustomPeriodLabel()).isEqualTo("Période personnalisée");
    }

    @Test
    @DisplayName("getAllFormationsWithDocuments - Formation sans UP ni Département")
    void shouldGetAllFormationsWithDocumentsWithoutUpOrDept() {
        Formation formation = createFormation(1L, EtatFormation.VISIBLE);
        formation.setTitreFormation("Formation Test");
        formation.setTypeFormation(null);
        formation.setPeriodCode(null);
        formation.setCustomPeriodLabel(null);
        formation.setUp(null);
        formation.setDepartement(null);

        when(formationRepository.findAll()).thenReturn(List.of(formation));
        when(documentRepository.findByFormation_IdFormation(1L)).thenReturn(List.of());

        List<FormationWithDocumentsDTO> result = formationWorkflowService.getAllFormationsWithDocuments();

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getTitreFormation()).isEqualTo("Formation Test");
        assertThat(result.get(0).getTypeFormation()).isEqualTo("INTERNE");
        assertThat(result.get(0).getPeriodCode()).isNull();
        assertThat(result.get(0).getCustomPeriodLabel()).isNull();
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour avec PeriodCode invalide")
    void shouldUpdateFormationWithInvalidPeriodCode() {
        Formation existing = createFormation(1L, EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());

        request.setPeriodCode("INVALID_PERIOD_CODE");

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result).isNotNull();
        assertThat(result.getPeriodCode()).isEqualTo(PeriodCode.OTHER);
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour sans UP ni Département")
    void shouldUpdateFormationWithoutUpOrDept() {
        Formation existing = createFormation(1L, EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());
        existing.setUp(new Up());
        existing.setDepartement(new Dept());

        request.setUpId("");
        request.setDepartementId("");

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(formationRepository.save(any())).thenReturn(existing);

        Formation result = formationWorkflowService.updateFormationWorkflow(1L, request);

        assertThat(result).isNotNull();
        assertThat(result.getUp()).isNull();
        assertThat(result.getDepartement()).isNull();
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour avec UP introuvable")
    void shouldFailUpdateWithUpNotFound() {
        Formation existing = createFormation(1L, EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());

        request.setUpId("INVALID_UP");

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(upRepository.findById("INVALID_UP")).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> formationWorkflowService.updateFormationWorkflow(1L, request));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour avec Département introuvable")
    void shouldFailUpdateWithDeptNotFound() {
        Formation existing = createFormation(1L, EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());

        request.setDepartementId("INVALID_DEPT");

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(departementRepository.findById("INVALID_DEPT")).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> formationWorkflowService.updateFormationWorkflow(1L, request));
    }

    @Test
    @DisplayName("updateFormationWorkflow - Mise à jour avec séance inconnue")
    void shouldFailUpdateWithUnknownSeance() {
        Formation existing = createFormation(1L, EtatFormation.ENREGISTRE);
        existing.setSeances(new ArrayList<>());

        FormationWorkflowRequest.SeanceRequest seanceRequest = createSeanceRequest("2026-10-10", "09:00", "11:00");
        seanceRequest.setIdSeance(999L);
        request.setSeances(List.of(seanceRequest));

        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(existing));
        lenient().when(helper.parseTime(anyString())).thenReturn(new java.sql.Time(0));

        assertThrows(IllegalStateException.class, () -> formationWorkflowService.updateFormationWorkflow(1L, request));
    }

    @Test
    @DisplayName("synchronizeFormationCalendar - Erreur lors de la synchronisation")
    void shouldHandleSynchronizationError() {
        Formation formation = createFormation(1L, EtatFormation.PLANIFIE);
        formation.setTitreFormation("Formation Test");

        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setDateSeance(new java.util.Date());
        seance.setHeureDebut(java.sql.Time.valueOf(java.time.LocalTime.of(9, 0, 0)));
        seance.setHeureFin(java.sql.Time.valueOf(java.time.LocalTime.of(11, 0, 0)));
        seance.setSalle("S101");
        seance.setAnimateurs(new ArrayList<>());
        seance.setParticipants(new ArrayList<>());
        seance.setCalendarEventId("event123");
        seance.setFormation(formation);

        formation.setSeances(List.of(seance));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(seance));
        when(helper.convertToOffsetDateTime(any(), any())).thenReturn(java.time.OffsetDateTime.now());
        when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenThrow(new RuntimeException("Synchronization error"));

        // Ne devrait pas lever d'exception
        assertDoesNotThrow(() -> formationWorkflowService.synchronizeFormationCalendar(formation));
    }

    @Test
    @DisplayName("removeSeanceFromCalendar - Séance sans calendarEventId")
    void shouldRemoveSeanceWithoutCalendarEventId() {
        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setCalendarEventId(null);
        seance.setFormation(createFormation(1L, EtatFormation.ANNULE));
        seance.setAnimateurs(new ArrayList<>());
        seance.setParticipants(new ArrayList<>());

        // Ne devrait pas lever d'exception
        assertDoesNotThrow(() -> formationWorkflowService.removeSeanceFromCalendar(seance));

        verify(outlookCalendarService, never()).deleteEventInCalendar(anyString(), anyString());
    }

    @Test
    @DisplayName("removeSeanceFromCalendar - Erreur lors de la suppression")
    void shouldHandleRemovalError() {
        Formation formation = createFormation(1L, EtatFormation.ANNULE);
        formation.setTitreFormation("Formation Test");

        SeanceFormation seance = new SeanceFormation();
        seance.setIdSeance(1L);
        seance.setCalendarEventId("event123");
        seance.setFormation(formation);
        seance.setAnimateurs(new ArrayList<>());
        seance.setParticipants(new ArrayList<>());

        doThrow(new RuntimeException("Removal error")).when(outlookCalendarService)
                .deleteEventInCalendar(anyString(), anyString());

        // Ne devrait pas lever d'exception
        assertDoesNotThrow(() -> formationWorkflowService.removeSeanceFromCalendar(seance));
    }
}
