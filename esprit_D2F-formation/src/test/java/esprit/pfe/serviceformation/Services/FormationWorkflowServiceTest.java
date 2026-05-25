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

    @InjectMocks
    private FormationWorkflowService formationWorkflowService;

    private FormationWorkflowRequest request;

    @BeforeEach
    void setUp() {
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
            if (f.getIdFormation() == null) f.setIdFormation(1L);
            if (f.getEtatFormation() == null) f.setEtatFormation(EtatFormation.ENREGISTRE);
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
        lenient().when(seanceFormationRepository.findByParticipantAndDate(anyString(), any())).thenReturn(List.of(new SeanceFormation()));
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(new Enseignant()));
        lenient().when(helper.parseTime(anyString())).thenReturn(new java.sql.Time(0));
        
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
        verify(outlookMailService, atLeastOnce()).sendMail(anyString(), anyString(), anyString());
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

        FormationDTO dto = formationWorkflowService.getFormationWorkflowById(1L);

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

        List<FormationDTO> list = formationWorkflowService.getAllFormationWorkflows();

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

        List<FormationDTO> list = formationWorkflowService.getFormationsByAnimateurEmail("test@esprit.tn");

        assertThat(list).isNotEmpty();
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
        
        List<FormationDTO> list = formationWorkflowService.getFormationsAchevees();
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
        
        List<FormationDTO> list = formationWorkflowService.getFormationsVisibles();
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsParUp - Succès")
    void shouldGetFormationsParUp() {
        Formation f = createFullFormation();
        f.setEtatFormation(EtatFormation.VISIBLE);
        lenient().when(formationRepository.findByUp_Id("UP1")).thenReturn(List.of(f));
        
        List<FormationDTO> list = formationWorkflowService.getFormationsParUp("UP1");
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsParDepartement - Succès")
    void shouldGetFormationsParDepartement() {
        Formation f = createFullFormation();
        lenient().when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));
        
        List<FormationDTO> list = formationWorkflowService.getFormationsParDepartement("D1");
        assertThat(list).isNotEmpty();
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
        sf.setDateSeance(new Date());
        sf.setHeureDebut(java.sql.Time.valueOf("09:00:00"));
        sf.setHeureFin(java.sql.Time.valueOf("11:00:00"));
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        
        f.setSeances(List.of(sf));
        
        lenient().when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        lenient().when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        lenient().when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("NEW_ID", "http://teams"));
        
        formationWorkflowService.synchronizeFormationCalendar(f);
        
        verify(outlookCalendarService).updateEventInCalendarWithTeamsUrl(any());
        verify(outlookMailService, atLeastOnce()).sendMail(anyString(), anyString(), anyString());
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
        lenient().when(helper.parseTime(anyString())).thenReturn(new java.sql.Time(0));

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
        verify(outlookCalendarService).deleteEventInCalendar(anyString(), eq("EV1"));
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
        verify(outlookMailService, atLeastOnce()).sendMail(anyString(), contains("Annulation"), anyString());
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
        lenient().when(helper.parseTime(any())).thenReturn(new java.sql.Time(0));

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
        try {
            sr.setDateSeance(new java.text.SimpleDateFormat("yyyy-MM-dd").parse(date));
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse date: " + date, e);
        }
        sr.setHeureDebut(debut);
        sr.setHeureFin(fin);
        return sr;
    }
}
