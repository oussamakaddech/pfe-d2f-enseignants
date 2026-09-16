package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.messaging.AnalyticsEventPublisher;
import esprit.pfe.serviceformation.messaging.EvaluationBatchMessage;
import esprit.pfe.serviceformation.messaging.EvaluationPublisher;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Month;
import org.mockito.InjectMocks;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowService - Line Coverage Tests")
class FormationWorkflowServiceLineCoverageTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceFormationRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private PresenceRepository presenceRepository;
    @Mock private DeptRepository departementRepository;
    @Mock private UpRepository upRepository;
    @Mock private AnimateurExterneRepository animateurExterneRepository;
    @Mock private EmailAuditLogRepository emailAuditLogRepository;
    @Mock private EvaluationPublisher evaluationPublisher;
    @Mock private AnalyticsEventPublisher analyticsEventPublisher;
    @Mock private OutlookCalendarService outlookCalendarService;
    @Mock private OutlookMailService outlookMailService;

    private FormationWorkflowServiceHelper helper;
    private final FormationMapper formationMapper = new FormationMapper();
    private AnimateurParticipantResolver animateurParticipantResolver;
    private FormationWorkflowService service;

    @BeforeEach
    void setUp() {
        helper = new FormationWorkflowServiceHelper(
                seanceFormationRepository, enseignantRepository, presenceRepository,
                departementRepository, upRepository, animateurExterneRepository,
                new AnimateurParticipantResolver(enseignantRepository));
        animateurParticipantResolver = new AnimateurParticipantResolver(enseignantRepository);

        service = new FormationWorkflowService(
                documentRepository, formationRepository, seanceFormationRepository,
                enseignantRepository, presenceRepository, departementRepository,
                upRepository, animateurExterneRepository,
                evaluationPublisher, analyticsEventPublisher,
                helper, formationMapper, animateurParticipantResolver,
                emailAuditLogRepository, outlookCalendarService, outlookMailService);

        ReflectionTestUtils.setField(service, "organizerEmail", "admin@esprit.tn");
        ReflectionTestUtils.setField(service, "platformUrl", "https://d2f.esprit.tn");
        ReflectionTestUtils.setField(service, "formationsPath", "/formations/");
    }

    private FormationWorkflowService serviceWithoutMail() {
        FormationWorkflowService s = new FormationWorkflowService(
                documentRepository, formationRepository, seanceFormationRepository,
                enseignantRepository, presenceRepository, departementRepository,
                upRepository, animateurExterneRepository,
                evaluationPublisher, analyticsEventPublisher,
                helper, formationMapper, animateurParticipantResolver,
                emailAuditLogRepository, outlookCalendarService, null);
        ReflectionTestUtils.setField(s, "organizerEmail", "admin@esprit.tn");
        ReflectionTestUtils.setField(s, "platformUrl", "https://d2f.esprit.tn");
        ReflectionTestUtils.setField(s, "formationsPath", "/formations/");
        return s;
    }

    private FormationWorkflowService serviceWithoutCalendar() {
        FormationWorkflowService s = new FormationWorkflowService(
                documentRepository, formationRepository, seanceFormationRepository,
                enseignantRepository, presenceRepository, departementRepository,
                upRepository, animateurExterneRepository,
                evaluationPublisher, analyticsEventPublisher,
                helper, formationMapper, animateurParticipantResolver,
                emailAuditLogRepository, null, outlookMailService);
        ReflectionTestUtils.setField(s, "organizerEmail", "admin@esprit.tn");
        ReflectionTestUtils.setField(s, "platformUrl", "https://d2f.esprit.tn");
        ReflectionTestUtils.setField(s, "formationsPath", "/formations/");
        return s;
    }

    // ── builders ──

    private Formation buildFormation(Long id, EtatFormation etat) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation("Formation Test");
        f.setDateDebut(LocalDate.of(2026, Month.JANUARY, 1));
        f.setDateFin(LocalDate.of(2026, Month.DECEMBER, 31));
        f.setTypeFormation(TypeFormation.INTERNE);
        f.setEtatFormation(etat);
        f.setCoutFormation(0f);
        f.setCoutHebergement(0f);
        f.setCoutRepas(0f);
        f.setCoutTransport(0f);
        f.setChargeHoraireGlobal(0);
        f.setOuverte(false);
        f.setInscriptionsOuvertes(false);
        f.setCertifGenerated(false);
        f.setSeances(new ArrayList<>());
        f.setAnimateurs(new ArrayList<>());
        f.setAnimateursExternes(new ArrayList<>());
        return f;
    }

    private SeanceFormation buildSeance(Long id, Formation f, LocalDate date, LocalTime debut, LocalTime fin) {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(id);
        sf.setFormation(f);
        sf.setDateSeance(date);
        sf.setHeureDebut(debut);
        sf.setHeureFin(fin);
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        return sf;
    }

    private Enseignant buildEnseignant(String id, String nom, String prenom, String mail, String type) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setNom(nom);
        e.setPrenom(prenom);
        e.setMail(mail);
        e.setType(type);
        e.setEtat("A");
        e.setCup("N");
        e.setChefDepartement("N");
        return e;
    }

    private AnimateurExterne buildAnimateurExterne(Long id) {
        AnimateurExterne ae = new AnimateurExterne();
        ae.setId(id);
        ae.setNom("NomExt");
        ae.setPrenom("PrenomExt");
        return ae;
    }

    private FormationWorkflowRequest buildRequest() {
        FormationWorkflowRequest r = new FormationWorkflowRequest();
        r.setTitreFormation("Formation Test");
        r.setDateDebut(LocalDate.of(2026, Month.JANUARY, 1));
        r.setDateFin(LocalDate.of(2026, Month.DECEMBER, 31));
        r.setTypeFormation(TypeFormation.INTERNE);
        r.setSeances(new ArrayList<>());
        return r;
    }

    private FormationWorkflowRequest.SeanceRequest buildSeanceRequest(LocalDate date, String hd, String hf, String salle) {
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        sr.setDateSeance(date);
        sr.setHeureDebut(hd);
        sr.setHeureFin(hf);
        sr.setSalle(salle);
        return sr;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  handleEtatTransitions
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("handleEtatTransitions - same state => no-op")
    void handleEtat_sameState() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        service.handleEtatTransitions(f, EtatFormation.ENREGISTRE);
        verifyNoInteractions(outlookMailService);
    }

    @Test @DisplayName("handleEtatTransitions - null oldEtat triggers transition")
    void handleEtat_nullOld() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        Up up = new Up("UP1", "UP Info"); f.setUp(up);
        Enseignant cup = buildEnseignant("C1", "Dup", "Jean", "c1@esprit.tn", "C1"); cup.setCup("O");
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cup));
        service.handleEtatTransitions(f, null);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("handleEtatTransitions - ENREGISTRE with CUP notification")
    void handleEtat_enregistre() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        Up up = new Up("UP1", "UP Info"); f.setUp(up);
        Enseignant cup = buildEnseignant("C1", "Dup", "Jean", "c1@esprit.tn", "C1"); cup.setCup("O");
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cup));
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("handleEtatTransitions - ENREGISTRE with null mail service")
    void handleEtat_enregistre_nullMail() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        serviceWithoutMail().handleEtatTransitions(f, EtatFormation.NOUVEAU);
    }

    @Test @DisplayName("handleEtatTransitions - PLANIFIE triggers calendar sync + notifications")
    void handleEtat_planifie() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle("B201"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT1", "https://teams"));
        service.handleEtatTransitions(f, EtatFormation.ENREGISTRE);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("handleEtatTransitions - VISIBLE notification")
    void handleEtat_visible() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        service.handleEtatTransitions(f, EtatFormation.ENREGISTRE);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("handleEtatTransitions - VISIBLE with null mail")
    void handleEtat_visible_nullMail() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        serviceWithoutMail().handleEtatTransitions(f, EtatFormation.ENREGISTRE);
    }

    @Test @DisplayName("handleEtatTransitions - EN_COURS with Teams links")
    void handleEtat_enCours_teams() {
        Formation f = buildFormation(1L, EtatFormation.EN_COURS);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setOnlineMeetingUrl("https://teams.microsoft.com/meeting1");
        f.setSeances(new ArrayList<>(List.of(sf)));
        service.handleEtatTransitions(f, EtatFormation.PLANIFIE);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("handleEtatTransitions - EN_COURS without Teams links")
    void handleEtat_enCours_noTeams() {
        Formation f = buildFormation(1L, EtatFormation.EN_COURS);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setOnlineMeetingUrl(null);
        f.setSeances(new ArrayList<>(List.of(sf)));
        service.handleEtatTransitions(f, EtatFormation.PLANIFIE);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("handleEtatTransitions - ACHEVE")
    void handleEtat_acheve() {
        Formation f = buildFormation(1L, EtatFormation.ACHEVE);
        service.handleEtatTransitions(f, EtatFormation.EN_COURS);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("handleEtatTransitions - ANNULE deletes calendar events")
    void handleEtat_annule() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_001"); f.setSeances(new ArrayList<>(List.of(sf)));
        service.handleEtatTransitions(f, EtatFormation.PLANIFIE);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), contains("Annulation"), anyString());
        verify(outlookCalendarService).deleteEventInCalendar("admin@esprit.tn", "EVT_001");
    }

    @Test @DisplayName("handleEtatTransitions - ANNULE with calendar cleanup exception")
    void handleEtat_annule_calEx() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_001"); f.setSeances(new ArrayList<>(List.of(sf)));
        doThrow(new RuntimeException("Graph API down")).when(outlookCalendarService).deleteEventInCalendar(anyString(), anyString());
        assertDoesNotThrow(() -> service.handleEtatTransitions(f, EtatFormation.PLANIFIE));
    }

    @Test @DisplayName("handleEtatTransitions - default case (NOUVEAU)")
    void handleEtat_default() {
        Formation f = buildFormation(1L, EtatFormation.NOUVEAU);
        service.handleEtatTransitions(f, EtatFormation.ENREGISTRE);
        verifyNoInteractions(outlookMailService);
    }

    @Test @DisplayName("handleEtatTransitions - exception in notify is caught")
    void handleEtat_exceptionCaught() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        f.setUp(null);
        assertDoesNotThrow(() -> service.handleEtatTransitions(f, EtatFormation.ENREGISTRE));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  createFormationWorkflow
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("createFormation - with participantsIds")
    void create_participantIds() {
        FormationWorkflowRequest r = buildRequest();
        r.setParticipantsIds(List.of("P1"));
        Enseignant p1 = buildEnseignant("P1", "N", "P", "p1@e.tn", "E");
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(p1));
        lenient().when(enseignantRepository.findAllById(anyCollection())).thenReturn(List.of(p1));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> { Formation f = inv.getArgument(0); f.setIdFormation(1L); f.setEtatFormation(EtatFormation.ENREGISTRE); return f; });
        lenient().when(seanceFormationRepository.existsSeanceConflict(anyString(), any(), any(), any())).thenReturn(false);
        lenient().when(seanceFormationRepository.existsSalleConflict(anyString(), any(), any(), any())).thenReturn(false);

        Formation result = service.createFormationWorkflow(r);
        assertThat(result).isNotNull();
        verify(evaluationPublisher).sendCreate(any());
    }

    @Test @DisplayName("createFormation - with participantConfig")
    void create_participantConfig() {
        FormationWorkflowRequest r = buildRequest();
        FormationWorkflowRequestAdditionConfig.ParticipantAdditionConfig pc = new FormationWorkflowRequestAdditionConfig.ParticipantAdditionConfig();
        pc.setMode(FormationWorkflowRequestAdditionConfig.AdditionMode.MANUAL);
        pc.setManualIds(List.of("P1"));
        r.setParticipantConfig(pc);
        Enseignant p1 = buildEnseignant("P1", "N", "P", "p1@e.tn", "E");
        lenient().when(enseignantRepository.findAllById(anyCollection())).thenReturn(List.of(p1));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> { Formation f = inv.getArgument(0); f.setIdFormation(1L); f.setEtatFormation(EtatFormation.ENREGISTRE); return f; });
        lenient().when(seanceFormationRepository.existsSeanceConflict(anyString(), any(), any(), any())).thenReturn(false);

        Formation result = service.createFormationWorkflow(r);
        assertThat(result).isNotNull();
    }

    @Test @DisplayName("createFormation - no participants, no seances")
    void create_empty() {
        FormationWorkflowRequest r = buildRequest();
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> { Formation f = inv.getArgument(0); f.setIdFormation(1L); f.setEtatFormation(EtatFormation.ENREGISTRE); return f; });

        Formation result = service.createFormationWorkflow(r);
        assertThat(result).isNotNull();
        verify(evaluationPublisher).sendCreate(any());
    }

    @Test @DisplayName("createFormation - evaluation publisher exception is caught")
    void create_evalException() {
        FormationWorkflowRequest r = buildRequest();
        r.setParticipantsIds(List.of("P1"));
        Enseignant p1 = buildEnseignant("P1", "N", "P", "p1@e.tn", "E");
        lenient().when(enseignantRepository.findById("P1")).thenReturn(Optional.of(p1));
        lenient().when(enseignantRepository.findAllById(anyCollection())).thenReturn(List.of(p1));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> { Formation f = inv.getArgument(0); f.setIdFormation(1L); f.setEtatFormation(EtatFormation.ENREGISTRE); return f; });
        lenient().when(seanceFormationRepository.existsSeanceConflict(anyString(), any(), any(), any())).thenReturn(false);
        doThrow(new RuntimeException("Broker down")).when(evaluationPublisher).sendCreate(any());
        assertDoesNotThrow(() -> service.createFormationWorkflow(r));
    }

    @Test @DisplayName("createFormation - null seances defaults to empty")
    void create_nullSeances() {
        FormationWorkflowRequest r = buildRequest();
        r.setSeances(null);
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> { Formation f = inv.getArgument(0); f.setIdFormation(1L); f.setEtatFormation(EtatFormation.ENREGISTRE); return f; });
        lenient().when(seanceFormationRepository.existsSeanceConflict(anyString(), any(), any(), any())).thenReturn(false);

        Formation result = service.createFormationWorkflow(r);
        assertThat(result).isNotNull();
    }

    @Test @DisplayName("createFormation - with animateurConfig")
    void create_animateurConfig() {
        FormationWorkflowRequest r = buildRequest();
        FormationWorkflowRequestAdditionConfig.AnimateurAdditionConfig ac = new FormationWorkflowRequestAdditionConfig.AnimateurAdditionConfig();
        ac.setMode(FormationWorkflowRequestAdditionConfig.AdditionMode.MANUAL);
        ac.setManualIds(List.of("A1"));
        r.setAnimateurConfig(ac);
        Enseignant a1 = buildEnseignant("A1", "A", "N", "a@e.tn", "E");
        lenient().when(enseignantRepository.findAllById(anyCollection())).thenReturn(List.of(a1));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> { Formation f = inv.getArgument(0); f.setIdFormation(1L); f.setEtatFormation(EtatFormation.ENREGISTRE); return f; });
        lenient().when(seanceFormationRepository.existsSeanceConflict(anyString(), any(), any(), any())).thenReturn(false);

        Formation result = service.createFormationWorkflow(r);
        assertThat(result.getAnimateurs()).hasSize(1);
    }

    @Test @DisplayName("createFormation - with animateursIds fallback")
    void create_animateursIds() {
        FormationWorkflowRequest r = buildRequest();
        r.setAnimateursIds(List.of("A1"));
        Enseignant a1 = buildEnseignant("A1", "A", "N", "a@e.tn", "E");
        lenient().when(enseignantRepository.findById("A1")).thenReturn(Optional.of(a1));
        lenient().when(formationRepository.save(any())).thenAnswer(inv -> { Formation f = inv.getArgument(0); f.setIdFormation(1L); f.setEtatFormation(EtatFormation.ENREGISTRE); return f; });

        Formation result = service.createFormationWorkflow(r);
        assertThat(result).isNotNull();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  updateFormationWorkflow
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("updateFormation - basic fields + PeriodCode + relations")
    void update_basicFields() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest();
        r.setUpId("UP1"); r.setDepartementId("D1"); r.setPeriodCode("WINTER");
        r.setAnimateursIds(List.of("A1")); r.setAnimateursExternesIds(List.of(1L));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        when(upRepository.findById("UP1")).thenReturn(Optional.of(new Up("UP1", "UP Info")));
        when(departementRepository.findById("D1")).thenReturn(Optional.of(new Dept("D1", "Dept")));
        when(enseignantRepository.findById("A1")).thenReturn(Optional.of(buildEnseignant("A1", "N", "P", "a@e.tn", "E")));
        when(animateurExterneRepository.findById(1L)).thenReturn(Optional.of(buildAnimateurExterne(1L)));

        Formation result = service.updateFormationWorkflow(1L, r);
        assertThat(result.getPeriodCode()).isEqualTo(PeriodCode.WINTER);
    }

    @Test @DisplayName("updateFormation - invalid PeriodCode => OTHER")
    void update_invalidPeriodCode() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest(); r.setPeriodCode("INVALID");
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        Formation result = service.updateFormationWorkflow(1L, r);
        assertThat(result.getPeriodCode()).isEqualTo(PeriodCode.OTHER);
    }

    @Test @DisplayName("updateFormation - null PeriodCode not overwritten")
    void update_nullPeriodCode() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE); ex.setPeriodCode(PeriodCode.WINTER);
        FormationWorkflowRequest r = buildRequest(); r.setPeriodCode(null);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        Formation result = service.updateFormationWorkflow(1L, r);
        assertThat(result.getPeriodCode()).isEqualTo(PeriodCode.WINTER);
    }

    @Test @DisplayName("updateFormation - blank UP clears UP")
    void update_blankUp() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE); ex.setUp(new Up("UP1", "Old"));
        FormationWorkflowRequest r = buildRequest(); r.setUpId("   ");
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        assertThat(service.updateFormationWorkflow(1L, r).getUp()).isNull();
    }

    @Test @DisplayName("updateFormation - blank departement clears dept")
    void update_blankDept() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE); ex.setDepartement(new Dept("D1", "Old"));
        FormationWorkflowRequest r = buildRequest(); r.setDepartementId("   ");
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        assertThat(service.updateFormationWorkflow(1L, r).getDepartement()).isNull();
    }

    @Test @DisplayName("updateFormation - not found throws")
    void update_notFound() {
        when(formationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> service.updateFormationWorkflow(99L, buildRequest()));
    }

    @Test @DisplayName("updateFormation - unknown seance throws")
    void update_unknownSeance() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest();
        FormationWorkflowRequest.SeanceRequest sr = new FormationWorkflowRequest.SeanceRequest();
        sr.setIdSeance(999L); r.setSeances(List.of(sr));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        assertThrows(IllegalStateException.class, () -> service.updateFormationWorkflow(1L, r));
    }

    @Test @DisplayName("updateFormation - up not found throws")
    void update_upNotFound() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest(); r.setUpId("MISSING");
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(upRepository.findById("MISSING")).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> service.updateFormationWorkflow(1L, r));
    }

    @Test @DisplayName("updateFormation - dept not found throws")
    void update_deptNotFound() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest(); r.setDepartementId("MISSING");
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(departementRepository.findById("MISSING")).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> service.updateFormationWorkflow(1L, r));
    }

    @Test @DisplayName("updateFormation - add new, update existing, remove orphan seance")
    void update_addUpdateRemove() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        SeanceFormation old = buildSeance(10L, ex, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        old.setCalendarEventId("EVT_OLD");
        ex.setSeances(new ArrayList<>(List.of(old)));
        FormationWorkflowRequest r = buildRequest();
        FormationWorkflowRequest.SeanceRequest srUpd = buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 12), "10:00", "12:00", "S1");
        srUpd.setIdSeance(10L);
        FormationWorkflowRequest.SeanceRequest srNew = buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 15), "14:00", "16:00", "S2");
        r.setSeances(List.of(srUpd, srNew));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        when(enseignantRepository.findAllById(anySet())).thenReturn(new ArrayList<>());
        when(seanceFormationRepository.existsSalleConflictIgnoringSelf(anyString(), any(), any(), any(), anyLong())).thenReturn(false);

        Formation result = service.updateFormationWorkflow(1L, r);
        assertThat(result.getSeances()).hasSize(2);
    }

    @Test @DisplayName("updateFormation - null seances in request")
    void update_nullSeances() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest(); r.setSeances(null);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        assertThat(service.updateFormationWorkflow(1L, r)).isNotNull();
    }

    @Test @DisplayName("updateFormation - null animateursIds in seance")
    void update_nullAnimInSeance() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest();
        FormationWorkflowRequest.SeanceRequest sr = buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 10), "09:00", "11:00", null);
        sr.setAnimateursIds(null); r.setSeances(List.of(sr));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        Formation result = service.updateFormationWorkflow(1L, r);
        assertThat(result).isNotNull();
    }

    @Test @DisplayName("updateFormation - syncPresencesForSeance delete + add")
    void update_syncPresences() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        SeanceFormation sf = buildSeance(10L, ex, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setFormation(null);
        ex.setSeances(new ArrayList<>(List.of(sf)));
        Enseignant oldE = buildEnseignant("OLD", "O", "E", "old@e.tn", "E");
        Presence oldP = new Presence(); oldP.setIdParticipation(1L); oldP.setEnseignant(oldE);
        Enseignant newE = buildEnseignant("NEW", "N", "E", "new@e.tn", "E");
        FormationWorkflowRequest r = buildRequest();
        r.setParticipantsIds(List.of("NEW"));
        FormationWorkflowRequest.SeanceRequest sr = buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 10), "09:00", "11:00", null);
        sr.setIdSeance(10L); r.setSeances(List.of(sr));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        when(enseignantRepository.findAllById(anySet())).thenReturn(List.of(newE));
        when(presenceRepository.findBySeanceFormation_IdSeance(10L)).thenReturn(new ArrayList<>(List.of(oldP)));
        when(enseignantRepository.findById("NEW")).thenReturn(Optional.of(newE));
        service.updateFormationWorkflow(1L, r);
        verify(presenceRepository).delete(oldP);
        verify(presenceRepository).save(any(Presence.class));
    }

    @Test @DisplayName("updateFormation - publishEvaluationUpdates with participants")
    void update_publishEval() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest(); r.setParticipantsIds(List.of("P1"));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        service.updateFormationWorkflow(1L, r);
        verify(evaluationPublisher).sendUpdate(any(EvaluationBatchMessage.class));
    }

    @Test @DisplayName("updateFormation - publishEvaluationUpdates exception caught")
    void update_publishEvalEx() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest(); r.setParticipantsIds(List.of("P1"));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        doThrow(new RuntimeException("Broker")).when(evaluationPublisher).sendUpdate(any());
        assertDoesNotThrow(() -> service.updateFormationWorkflow(1L, r));
    }

    @Test @DisplayName("updateFormation - same state + Outlook events => resync calendar")
    void update_sameStateResync() {
        Formation ex = buildFormation(1L, EtatFormation.PLANIFIE);
        SeanceFormation sf = buildSeance(10L, ex, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1"); sf.setSalle("A100");
        ex.setSeances(new ArrayList<>(List.of(sf)));
        FormationWorkflowRequest r = buildRequest(); r.setEtatFormation(EtatFormation.PLANIFIE);
        FormationWorkflowRequest.SeanceRequest sr = buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 10), "09:00", "11:00", "A100");
        sr.setIdSeance(10L); r.setSeances(List.of(sr));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_1", "https://teams"));
        service.updateFormationWorkflow(1L, r);
        verify(outlookCalendarService, atLeastOnce()).updateEventInCalendarWithTeamsUrl(any());
    }

    @Test @DisplayName("updateFormation - null participantsIds")
    void update_nullPartIds() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest(); r.setParticipantsIds(null);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        assertThat(service.updateFormationWorkflow(1L, r)).isNotNull();
    }

    @Test @DisplayName("updateFormation - null animateurConfig + non-empty animateursIds")
    void update_animIdsNoConfig() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest();
        r.setAnimateurConfig(null); r.setAnimateursIds(List.of("A1"));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        when(enseignantRepository.findById("A1")).thenReturn(Optional.of(buildEnseignant("A1", "N", "P", "a@e.tn", "E")));
        assertThat(service.updateFormationWorkflow(1L, r)).isNotNull();
    }

    @Test @DisplayName("updateFormation - empty animateursIds fallback")
    void update_emptyAnimIds() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest();
        r.setAnimateurConfig(null); r.setAnimateursIds(new ArrayList<>());
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        assertThat(service.updateFormationWorkflow(1L, r)).isNotNull();
    }

    @Test @DisplayName("updateFormation - salle conflict new seance throws")
    void update_salleConflictNew() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest();
        r.setSeances(List.of(buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 10), "09:00", "11:00", "S1")));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(seanceFormationRepository.existsSalleConflict(anyString(), any(), any(), any())).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.updateFormationWorkflow(1L, r));
    }

    @Test @DisplayName("updateFormation - salle conflict existing seance throws")
    void update_salleConflictExisting() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        SeanceFormation sf = buildSeance(10L, ex, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        ex.setSeances(new ArrayList<>(List.of(sf)));
        FormationWorkflowRequest r = buildRequest();
        FormationWorkflowRequest.SeanceRequest sr = buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 12), "09:00", "11:00", "S1");
        sr.setIdSeance(10L); r.setSeances(List.of(sr));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(seanceFormationRepository.existsSalleConflictIgnoringSelf(anyString(), any(), any(), any(), anyLong())).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.updateFormationWorkflow(1L, r));
    }

    @Test @DisplayName("updateFormation - blank/null salle skips conflict check")
    void update_blankSalleNoConflict() {
        Formation ex = buildFormation(1L, EtatFormation.ENREGISTRE);
        FormationWorkflowRequest r = buildRequest();
        r.setSeances(List.of(buildSeanceRequest(LocalDate.of(2026, Month.OCTOBER, 10), "09:00", "11:00", "  ")));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(ex));
        when(formationRepository.save(any())).thenReturn(ex);
        service.updateFormationWorkflow(1L, r);
        verify(seanceFormationRepository, never()).existsSalleConflict(anyString(), any(), any(), any());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  deleteFormationWorkflow
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("deleteFormation - success")
    void delete_ok() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        service.deleteFormationWorkflow(1L);
        verify(formationRepository).delete(f);
    }

    @Test @DisplayName("deleteFormation - not found throws")
    void delete_notFound() {
        when(formationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.deleteFormationWorkflow(99L));
    }

    @Test @DisplayName("deleteFormation - calendar cleanup exception doesn't prevent delete")
    void delete_calEx() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        FormationWorkflowService spyService = spy(service);
        doThrow(new RuntimeException("Calendar API down")).when(spyService).removeFormationCalendar(any());
        spyService.deleteFormationWorkflow(1L);
        verify(formationRepository).delete(f);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  removeFormationCalendar
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("removeFormationCalendar - with events")
    void removeCal_withEvents() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        service.removeFormationCalendar(f);
        verify(outlookCalendarService).deleteEventInCalendar("admin@esprit.tn", "EVT_1");
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("removeFormationCalendar - null calendar service")
    void removeCal_nullCal() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        serviceWithoutCalendar().removeFormationCalendar(f);
        verifyNoInteractions(outlookCalendarService);
    }

    @Test @DisplayName("removeFormationCalendar - event deletion exception caught")
    void removeCal_delEx() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        doThrow(new RuntimeException("Graph")).when(outlookCalendarService).deleteEventInCalendar(anyString(), anyString());
        assertDoesNotThrow(() -> service.removeFormationCalendar(f));
    }

    @Test @DisplayName("removeFormationCalendar - null mail service skips emails")
    void removeCal_nullMail() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        serviceWithoutMail().removeFormationCalendar(f);
        verify(outlookCalendarService).deleteEventInCalendar("admin@esprit.tn", "EVT_1");
    }

    @Test @DisplayName("removeFormationCalendar - multiple seances plural note")
    void removeCal_multipleSeances() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf1 = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf1.setCalendarEventId("EVT_1");
        SeanceFormation sf2 = buildSeance(11L, f, LocalDate.of(2026, Month.OCTOBER, 11), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf2.setCalendarEventId("EVT_2");
        f.setSeances(new ArrayList<>(List.of(sf1, sf2)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        service.removeFormationCalendar(f);
        verify(outlookCalendarService).deleteEventInCalendar("admin@esprit.tn", "EVT_1");
        verify(outlookCalendarService).deleteEventInCalendar("admin@esprit.tn", "EVT_2");
    }

    @Test @DisplayName("removeFormationCalendar - seance without calendarEventId skipped")
    void removeCal_noEventId() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId(null); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        service.removeFormationCalendar(f);
        verify(outlookCalendarService, never()).deleteEventInCalendar(anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  removeSeanceFromCalendar
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("removeSeanceFromCalendar - with eventId")
    void removeSeance_withEventId() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1");
        service.removeSeanceFromCalendar(sf);
        verify(outlookCalendarService).deleteEventInCalendar("admin@esprit.tn", "EVT_1");
    }

    @Test @DisplayName("removeSeanceFromCalendar - null calendar service")
    void removeSeance_nullCal() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1");
        serviceWithoutCalendar().removeSeanceFromCalendar(sf);
        verifyNoInteractions(outlookCalendarService);
    }

    @Test @DisplayName("removeSeanceFromCalendar - no eventId skips delete")
    void removeSeance_noEventId() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId(null);
        service.removeSeanceFromCalendar(sf);
        verify(outlookCalendarService, never()).deleteEventInCalendar(anyString(), anyString());
    }

    @Test @DisplayName("removeSeanceFromCalendar - delete exception caught")
    void removeSeance_delEx() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1");
        doThrow(new RuntimeException("Graph")).when(outlookCalendarService).deleteEventInCalendar(anyString(), anyString());
        assertDoesNotThrow(() -> service.removeSeanceFromCalendar(sf));
    }

    @Test @DisplayName("removeSeanceFromCalendar - null mail skips cancellation emails")
    void removeSeance_nullMail() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1");
        serviceWithoutMail().removeSeanceFromCalendar(sf);
        verifyNoInteractions(outlookMailService);
    }

    @Test @DisplayName("removeSeanceFromCalendar - blank email skipped")
    void removeSeance_blankEmail() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1");
        Enseignant eBlank = buildEnseignant("E1", "N", "P", "  ", "E");
        sf.setAnimateurs(new ArrayList<>(List.of(eBlank)));
        service.removeSeanceFromCalendar(sf);
        verify(outlookMailService, never()).sendMail(eq("   "), anyString(), anyString());
    }

    @Test @DisplayName("removeSeanceFromCalendar - mail send exception caught")
    void removeSeance_mailEx() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setCalendarEventId("EVT_1");
        doThrow(new RuntimeException("Mail")).when(outlookMailService).sendMail(anyString(), anyString(), anyString());
        assertDoesNotThrow(() -> service.removeSeanceFromCalendar(sf));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  synchronizeFormationCalendar
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("synchronizeCalendar - new event created")
    void syncCal_newEvent() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle("B201"); sf.setCalendarEventId(null); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", "https://teams"));
        service.synchronizeFormationCalendar(f);
        assertThat(sf.getCalendarEventId()).isEqualTo("EVT_NEW");
        assertThat(sf.getOnlineMeetingUrl()).isEqualTo("https://teams");
    }

    @Test @DisplayName("synchronizeCalendar - update existing event")
    void syncCal_updateEvent() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle("B201"); sf.setCalendarEventId("EVT_OLD"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_OLD", "https://teams2"));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).updateEventInCalendarWithTeamsUrl(any());
        assertThat(sf.getOnlineMeetingUrl()).isEqualTo("https://teams2");
    }

    @Test @DisplayName("synchronizeCalendar - formation not found throws")
    void syncCal_formNotFound() {
        when(formationRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> service.synchronizeFormationCalendar(buildFormation(1L, EtatFormation.PLANIFIE)));
    }

    @Test @DisplayName("synchronizeCalendar - seance not found throws")
    void syncCal_seanceNotFound() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        f.setSeances(new ArrayList<>(List.of(buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0)))));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> service.synchronizeFormationCalendar(f));
    }

    @Test @DisplayName("synchronizeCalendar - event creation exception caught")
    void syncCal_eventEx() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle("B201"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any())).thenThrow(new RuntimeException("Graph"));
        assertDoesNotThrow(() -> service.synchronizeFormationCalendar(f));
    }

    @Test @DisplayName("synchronizeCalendar - null calendar service")
    void syncCal_nullCal() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        serviceWithoutCalendar().synchronizeFormationCalendar(f);
        verifyNoInteractions(outlookCalendarService);
    }

    @Test @DisplayName("synchronizeCalendar - salle from formation when seance salle is null")
    void syncCal_salleFromFormation() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE); f.setSalle("FORMATION_SALLE");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle(null); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    @Test @DisplayName("synchronizeCalendar - with animateurs + externe formateur in subject")
    void syncCal_withAnimAndExterne() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE); f.setSalle("F_SALLE");
        Enseignant anim = buildEnseignant("A1", "Dup", "Jean", "a@e.tn", "E");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle(null); sf.setAnimateurs(new ArrayList<>(List.of(anim)));
        f.setSeances(new ArrayList<>(List.of(sf)));
        f.setExterneFormateurNom("ExtNom"); f.setExterneFormateurPrenom("ExtPrenom");
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    @Test @DisplayName("synchronizeCalendar - buildEventSubject with blank salle and blank titre")
    void syncCal_blankSalleAndTitre() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        f.setSalle(null); f.setTitreFormation("  ");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle("   "); sf.setCalendarEventId(null); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    @Test @DisplayName("synchronizeCalendar - emails set with animateurs, participants, ext email")
    void syncCal_emailsSet() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        f.setExterneFormateurEmail("ext@ext.com");
        Enseignant anim = buildEnseignant("A1", "N", "P", "a@e.tn", "E");
        Enseignant part = buildEnseignant("P1", "N2", "P2", "p@e.tn", "E");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026, Month.OCTOBER, 10), LocalTime.of(9, 0), LocalTime.of(11, 0));
        sf.setSalle("B201"); sf.setCalendarEventId(null);
        sf.setAnimateurs(new ArrayList<>(List.of(anim)));
        sf.setParticipants(new ArrayList<>(List.of(part)));
        f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationWorkflowById
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("getById - success")
    void getById_ok() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        FormationResponseDTO dto = service.getFormationWorkflowById(1L);
        assertThat(dto).isNotNull();
        assertThat(dto.getTitreFormation()).isEqualTo("Formation Test");
    }

    @Test @DisplayName("getById - not found throws")
    void getById_notFound() {
        when(formationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.getFormationWorkflowById(99L));
    }

    @Test @DisplayName("getById - null seances and animateurs")
    void getById_nullCollections() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setSeances(null); f.setAnimateurs(null); f.setAnimateursExternes(null);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        assertThat(service.getFormationWorkflowById(1L)).isNotNull();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getAllFormationWorkflows
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("getAll - success")
    void getAll_ok() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setFormationCompetences(new ArrayList<>()); f.setInscriptions(new ArrayList<>());
        when(formationRepository.findAll()).thenReturn(List.of(f));
        List<FormationResponseDTO> result = service.getAllFormationWorkflows();
        assertThat(result).hasSize(1);
    }

    @Test @DisplayName("getAll - null collections")
    void getAll_nullCollections() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setSeances(null); f.setAnimateurs(null); f.setFormationCompetences(null); f.setInscriptions(null);
        when(formationRepository.findAll()).thenReturn(List.of(f));
        assertThat(service.getAllFormationWorkflows()).hasSize(1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  updatePresence
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("updatePresence - success")
    void updatePres_ok() {
        Presence p = new Presence(); p.setIdParticipation(1L);
        when(presenceRepository.findById(1L)).thenReturn(Optional.of(p));
        service.updatePresence(1L, true, "Present");
        assertTrue(p.isPresent());
        assertThat(p.getCommentaire()).isEqualTo("Present");
        verify(presenceRepository).save(p);
    }

    @Test @DisplayName("updatePresence - not found throws")
    void updatePres_notFound() {
        when(presenceRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.updatePresence(99L, true, "OK"));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  mapEnseignantToDTO / mapSeanceToDTO
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("mapEnseignantToDTO - success")
    void mapEns_ok() {
        Enseignant e = buildEnseignant("E1", "Nom", "Prenom", "e@e.tn", "E");
        EnseignantDTO dto = service.mapEnseignantToDTO(e);
        assertThat(dto.getId()).isEqualTo("E1");
        assertThat(dto.getNom()).isEqualTo("Nom");
    }

    @Test @DisplayName("mapSeanceToDTO - with animateurs and participants")
    void mapSeance_ok() {
        Enseignant e1 = buildEnseignant("E1", "N", "P", "e@e.tn", "E");
        SeanceFormation sf = buildSeance(1L, buildFormation(1L, EtatFormation.ENREGISTRE), LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setAnimateurs(new ArrayList<>(List.of(e1))); sf.setParticipants(new ArrayList<>(List.of(e1)));
        SeanceDTO dto = service.mapSeanceToDTO(sf);
        assertThat(dto.getAnimateurs()).hasSize(1);
        assertThat(dto.getParticipants()).hasSize(1);
    }

    @Test @DisplayName("mapSeanceToDTO - null collections")
    void mapSeance_null() {
        SeanceFormation sf = buildSeance(1L, buildFormation(1L, EtatFormation.ENREGISTRE), LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setAnimateurs(null); sf.setParticipants(null);
        assertThat(service.mapSeanceToDTO(sf).getIdSeance()).isEqualTo(1L);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getPresencesBySeance
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("getPresencesBySeance - success")
    void getPres_ok() {
        SeanceFormation sf = new SeanceFormation(); sf.setIdSeance(1L);
        Presence p = new Presence(); p.setIdParticipation(1L);
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        sf.setPresences(new ArrayList<>(List.of(p)));
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        assertThat(service.getPresencesBySeance(1L)).hasSize(1);
    }

    @Test @DisplayName("getPresencesBySeance - null presences returns empty")
    void getPres_nullPresences() {
        SeanceFormation sf = new SeanceFormation(); sf.setIdSeance(1L); sf.setPresences(null);
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        assertThat(service.getPresencesBySeance(1L)).isEmpty();
    }

    @Test @DisplayName("getPresencesBySeance - not found throws")
    void getPres_notFound() {
        when(seanceFormationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.getPresencesBySeance(99L));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  batchUpdatePresences
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("batchUpdate - null request returns existing")
    void batch_nullReq() {
        Presence p = new Presence(); p.setIdParticipation(1L);
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        SeanceFormation sf = new SeanceFormation(); sf.setIdSeance(1L); sf.setPresences(new ArrayList<>(List.of(p)));
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        assertThat(service.batchUpdatePresences(1L, null)).isNotEmpty();
    }

    @Test @DisplayName("batchUpdate - empty updates")
    void batch_emptyUpdates() {
        SeanceFormation sf = new SeanceFormation(); sf.setIdSeance(1L); sf.setPresences(new ArrayList<>());
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest(new ArrayList<>());
        assertThat(service.batchUpdatePresences(1L, req)).isEmpty();
    }

    @Test @DisplayName("batchUpdate - valid update")
    void batch_valid() {
        Presence p = new Presence(); p.setIdParticipation(1L); p.setPresent(false);
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest(List.of(new BatchPresenceUpdateRequest.Item(1L, true, "OK")));
        service.batchUpdatePresences(1L, req);
        assertTrue(p.isPresent());
        assertThat(p.getCommentaire()).isEqualTo("OK");
        verify(presenceRepository).saveAll(anyList());
    }

    @Test @DisplayName("batchUpdate - null item and null idParticipation")
    void batch_nullItem() {
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>());
        List<BatchPresenceUpdateRequest.Item> items = new ArrayList<>();
        items.add(new BatchPresenceUpdateRequest.Item(null, true, null));
        items.add(null);
        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest(items);
        assertThat(service.batchUpdatePresences(1L, req)).isEmpty();
    }

    @Test @DisplayName("batchUpdate - item not found in seance")
    void batch_itemNotFound() {
        Presence p = new Presence(); p.setIdParticipation(1L);
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest(List.of(new BatchPresenceUpdateRequest.Item(999L, true, "X")));
        assertThat(service.batchUpdatePresences(1L, req)).hasSize(1);
    }

    @Test @DisplayName("batchUpdate - null commentaire keeps existing")
    void batch_nullCommentaire() {
        Presence p = new Presence(); p.setIdParticipation(1L); p.setCommentaire("Old");
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest(List.of(new BatchPresenceUpdateRequest.Item(1L, true, null)));
        service.batchUpdatePresences(1L, req);
        assertThat(p.getCommentaire()).isEqualTo("Old");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  markAllPresences
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("markAll - present with default commentaire")
    void markAll_present_default() {
        Presence p = new Presence(); p.setPresent(false); p.setCommentaire("Presence a valider");
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        service.markAllPresences(1L, true);
        assertTrue(p.isPresent());
        assertThat(p.getCommentaire()).isEqualTo("Presence confirmee");
    }

    @Test @DisplayName("markAll - present with custom commentaire")
    void markAll_present_custom() {
        Presence p = new Presence(); p.setPresent(false); p.setCommentaire("Custom");
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        service.markAllPresences(1L, true);
        assertThat(p.getCommentaire()).isEqualTo("Custom");
    }

    @Test @DisplayName("markAll - absent")
    void markAll_absent() {
        Presence p = new Presence(); p.setPresent(true);
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        service.markAllPresences(1L, false);
        assertFalse(p.isPresent());
    }

    @Test @DisplayName("markAll - empty list")
    void markAll_empty() {
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>());
        assertThat(service.markAllPresences(1L, true)).isEmpty();
        verify(presenceRepository).saveAll(anyList());
    }

    @Test @DisplayName("markAll - null commentaire triggers confirmee")
    void markAll_nullComment() {
        Presence p = new Presence(); p.setPresent(false); p.setCommentaire(null);
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        service.markAllPresences(1L, true);
        assertThat(p.getCommentaire()).isEqualTo("Presence confirmee");
    }

    @Test @DisplayName("markAll - blank commentaire triggers confirmee")
    void markAll_blankComment() {
        Presence p = new Presence(); p.setPresent(false); p.setCommentaire("   ");
        p.setEnseignant(buildEnseignant("E1", "N", "P", "e@e.tn", "E"));
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>(List.of(p)));
        service.markAllPresences(1L, true);
        assertThat(p.getCommentaire()).isEqualTo("Presence confirmee");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getSeancePresenceStats
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("stats - with presences")
    void stats_withPresences() {
        Presence p1 = new Presence(); p1.setPresent(true);
        Presence p2 = new Presence(); p2.setPresent(false);
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p1, p2));
        var stats = service.getSeancePresenceStats(1L);
        assertThat(stats.getTotal()).isEqualTo(2);
        assertThat(stats.getPresents()).isEqualTo(1);
        assertThat(stats.getTauxPresence()).isEqualTo(50.0);
    }

    @Test @DisplayName("stats - empty")
    void stats_empty() {
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>());
        var stats = service.getSeancePresenceStats(1L);
        assertThat(stats.getTotal()).isEqualTo(0);
        assertThat(stats.getTauxPresence()).isEqualTo(0.0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getMesPresences
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("getMesPresences - success")
    void mesPres_ok() {
        Enseignant ens = buildEnseignant("E1", "Nom", "Prenom", "e@e.tn", "E");
        Presence p = new Presence(); p.setIdParticipation(1L); p.setPresent(true); p.setCommentaire("OK");
        SeanceFormation sf = buildSeance(10L, buildFormation(1L, EtatFormation.EN_COURS), LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle("B201"); p.setSeanceFormation(sf);
        when(enseignantRepository.findByMailIgnoreCase("e@e.tn")).thenReturn(Optional.of(ens));
        when(presenceRepository.findByEnseignant_Id("E1")).thenReturn(List.of(p));
        List<MesPresenceDTO> result = service.getMesPresences("e@e.tn");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSeanceId()).isEqualTo(10L);
        assertThat(result.get(0).getFormationId()).isEqualTo(1L);
        assertThat(result.get(0).getEtatFormation()).isEqualTo("EN_COURS");
    }

    @Test @DisplayName("getMesPresences - not found throws")
    void mesPres_notFound() {
        when(enseignantRepository.findByMailIgnoreCase("x@e.tn")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.getMesPresences("x@e.tn"));
    }

    @Test @DisplayName("getMesPresences - null seance details")
    void mesPres_nullSeance() {
        Enseignant ens = buildEnseignant("E1", "N", "P", "e@e.tn", "E");
        Presence p = new Presence(); p.setIdParticipation(1L); p.setSeanceFormation(null);
        when(enseignantRepository.findByMailIgnoreCase("e@e.tn")).thenReturn(Optional.of(ens));
        when(presenceRepository.findByEnseignant_Id("E1")).thenReturn(List.of(p));
        List<MesPresenceDTO> result = service.getMesPresences("e@e.tn");
        assertThat(result.get(0).getSeanceId()).isNull();
    }

    @Test @DisplayName("getMesPresences - null heures and null etatFormation")
    void mesPres_nullHeures() {
        Enseignant ens = buildEnseignant("E1", "N", "P", "e@e.tn", "E");
        Presence p = new Presence(); p.setIdParticipation(1L);
        SeanceFormation sf = new SeanceFormation(); sf.setIdSeance(10L);
        sf.setHeureDebut(null); sf.setHeureFin(null);
        Formation f = buildFormation(1L, null); f.setEtatFormation(null);
        sf.setFormation(f); p.setSeanceFormation(sf);
        when(enseignantRepository.findByMailIgnoreCase("e@e.tn")).thenReturn(Optional.of(ens));
        when(presenceRepository.findByEnseignant_Id("E1")).thenReturn(List.of(p));
        List<MesPresenceDTO> result = service.getMesPresences("e@e.tn");
        assertThat(result.get(0).getHeureDebut()).isNull();
        assertThat(result.get(0).getEtatFormation()).isNull();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsAchevees
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("achevees - success")
    void achevees_ok() {
        Formation f = buildFormation(1L, EtatFormation.ACHEVE);
        when(formationRepository.findByEtatFormation(EtatFormation.ACHEVE)).thenReturn(List.of(f));
        assertThat(service.getFormationsAchevees()).hasSize(1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getAllFormationsWithDocuments
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("withDocuments - with dept and UP")
    void withDoc_deptUp() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setDepartement(new Dept("D1", "Info")); f.setUp(new Up("UP1", "UP Info"));
        when(formationRepository.findAll()).thenReturn(List.of(f));
        when(documentRepository.findByFormation_IdFormation(1L)).thenReturn(new ArrayList<>());
        List<FormationWithDocumentsDTO> result = service.getAllFormationsWithDocuments();
        assertThat(result.get(0).getDepartement1()).isNotNull();
        assertThat(result.get(0).getUp1()).isNotNull();
    }

    @Test @DisplayName("withDocuments - null dept and UP")
    void withDoc_nullDeptUp() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setDepartement(null); f.setUp(null);
        f.setTypeFormation(null); f.setEtatFormation(null);
        f.setCoutFormation(null); f.setChargeHoraireGlobal(null);
        when(formationRepository.findAll()).thenReturn(List.of(f));
        when(documentRepository.findByFormation_IdFormation(1L)).thenReturn(new ArrayList<>());
        List<FormationWithDocumentsDTO> result = service.getAllFormationsWithDocuments();
        assertThat(result.get(0).getDepartement1()).isNull();
        assertThat(result.get(0).getUp1()).isNull();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsForCalendar / setInscriptionsOuvertes
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("forCalendar - success")
    void forCal_ok() {
        when(formationRepository.findDistinctBySeances_Animateurs_Id("E1")).thenReturn(new ArrayList<>());
        when(formationRepository.findDistinctBySeances_Participants_Id("E1")).thenReturn(new ArrayList<>());
        assertThat(service.getFormationsForCalendar("E1")).isNotNull();
    }

    @Test @DisplayName("setInscriptionsOuvertes - true")
    void setInsc_ok() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(formationRepository.save(any())).thenReturn(f);
        service.setInscriptionsOuvertes(1L, true);
        assertTrue(f.isInscriptionsOuvertes());
    }

    @Test @DisplayName("setInscriptionsOuvertes - not found")
    void setInsc_notFound() {
        when(formationRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.setInscriptionsOuvertes(99L, true));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsVisibles (various etat branches)
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("visibles - VISIBLE")
    void visibles_visible() {
        when(formationRepository.findAll()).thenReturn(List.of(buildFormation(1L, EtatFormation.VISIBLE)));
        assertThat(service.getFormationsVisibles()).hasSize(1);
    }

    @Test @DisplayName("visibles - PLANIFIE")
    void visibles_planifie() {
        when(formationRepository.findAll()).thenReturn(List.of(buildFormation(1L, EtatFormation.PLANIFIE)));
        assertThat(service.getFormationsVisibles()).hasSize(1);
    }

    @Test @DisplayName("visibles - EN_COURS")
    void visibles_enCours() {
        when(formationRepository.findAll()).thenReturn(List.of(buildFormation(1L, EtatFormation.EN_COURS)));
        assertThat(service.getFormationsVisibles()).hasSize(1);
    }

    @Test @DisplayName("visibles - inscriptionsOuvertes")
    void visibles_inscOuvertes() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE); f.setInscriptionsOuvertes(true);
        when(formationRepository.findAll()).thenReturn(List.of(f));
        assertThat(service.getFormationsVisibles()).hasSize(1);
    }

    @Test @DisplayName("visibles - filtered ANNULE")
    void visibles_filtered() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE); f.setInscriptionsOuvertes(false);
        when(formationRepository.findAll()).thenReturn(List.of(f));
        assertThat(service.getFormationsVisibles()).isEmpty();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsParUp
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("parUp - success")
    void parUp_ok() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        f.setFormationCompetences(new ArrayList<>()); f.setInscriptions(new ArrayList<>());
        when(formationRepository.findByUp_Id("UP1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParUp("UP1")).hasSize(1);
    }

    @Test @DisplayName("parUp - null collections")
    void parUp_null() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        f.setSeances(null); f.setFormationCompetences(null); f.setInscriptions(null);
        when(formationRepository.findByUp_Id("UP1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParUp("UP1")).hasSize(1);
    }

    @Test @DisplayName("parUp - filtered ANNULE")
    void parUp_filtered() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE); f.setInscriptionsOuvertes(false);
        when(formationRepository.findByUp_Id("UP1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParUp("UP1")).isEmpty();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsParDepartement
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("parDept - success")
    void parDept_ok() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setFormationCompetences(new ArrayList<>()); f.setInscriptions(new ArrayList<>());
        when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParDepartement("D1")).hasSize(1);
    }

    @Test @DisplayName("parDept - null collections")
    void parDept_null() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setSeances(null); f.setFormationCompetences(null); f.setInscriptions(null);
        when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParDepartement("D1")).hasSize(1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsByAnimateurEmail
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("byEmail - success EN_COURS")
    void byEmail_ok() {
        Formation f = buildFormation(1L, EtatFormation.EN_COURS);
        when(formationRepository.findDistinctBySeancesAnimateursMail("a@e.tn")).thenReturn(List.of(f));
        assertThat(service.getFormationsByAnimateurEmail("a@e.tn")).hasSize(1);
    }

    @Test @DisplayName("byEmail - filters out non-EN_COURS")
    void byEmail_filtered() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        when(formationRepository.findDistinctBySeancesAnimateursMail("a@e.tn")).thenReturn(List.of(f));
        assertThat(service.getFormationsByAnimateurEmail("a@e.tn")).isEmpty();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  notifyCUPOfApprovedFormation
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("cupApproved - null mail service")
    void cupApproved_nullMail() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        serviceWithoutMail().notifyCUPOfApprovedFormation(f);
    }

    @Test @DisplayName("cupApproved - null UP")
    void cupApproved_nullUp() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE); f.setUp(null);
        service.notifyCUPOfApprovedFormation(f);
        verify(enseignantRepository, never()).findByUpAndCup(any(), anyString());
    }

    @Test @DisplayName("cupApproved - success")
    void cupApproved_ok() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        Up up = new Up("UP1", "UP Info"); f.setUp(up);
        Enseignant cup = buildEnseignant("C1", "D", "J", "c@e.tn", "C1"); cup.setCup("O");
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cup));
        service.notifyCUPOfApprovedFormation(f);
        verify(outlookMailService).sendMail(eq("c@e.tn"), contains("approuv"), anyString());
    }

    @Test @DisplayName("cupApproved - mail exception caught")
    void cupApproved_mailEx() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        Up up = new Up("UP1", "UP Info"); f.setUp(up);
        Enseignant cup = buildEnseignant("C1", "D", "J", "c@e.tn", "C1"); cup.setCup("O");
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cup));
        doThrow(new RuntimeException("Mail")).when(outlookMailService).sendMail(anyString(), anyString(), anyString());
        assertDoesNotThrow(() -> service.notifyCUPOfApprovedFormation(f));
    }

    @Test @DisplayName("cupApproved - blank mail skipped")
    void cupApproved_blankMail() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        Up up = new Up("UP1", "UP Info"); f.setUp(up);
        Enseignant cup = buildEnseignant("C1", "D", "J", "  ", "C1"); cup.setCup("O");
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cup));
        service.notifyCUPOfApprovedFormation(f);
        verify(outlookMailService, never()).sendMail(anyString(), anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  notifyTeachersOfApprovedFormation
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("teachersApproved - null mail")
    void teachersApproved_nullMail() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        serviceWithoutMail().notifyTeachersOfApprovedFormation(f);
    }

    @Test @DisplayName("teachersApproved - no seances")
    void teachersApproved_noSeances() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE); f.setSeances(null);
        service.notifyTeachersOfApprovedFormation(f);
        verify(enseignantRepository, never()).findAllById(anyCollection());
    }

    @Test @DisplayName("teachersApproved - success with recipients")
    void teachersApproved_ok() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        Enseignant e1 = buildEnseignant("E1", "D", "J", "e@e.tn", "E");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setAnimateurs(new ArrayList<>(List.of(e1))); f.setSeances(new ArrayList<>(List.of(sf)));
        when(enseignantRepository.findAllById(anySet())).thenReturn(List.of(e1));
        service.notifyTeachersOfApprovedFormation(f);
        verify(outlookMailService).sendMail(eq("e@e.tn"), contains("disponible"), anyString());
    }

    @Test @DisplayName("teachersApproved - blank mail recipient skipped")
    void teachersApproved_blankMail() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        Enseignant eBlank = buildEnseignant("E1", "D", "J", "  ", "E");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setAnimateurs(new ArrayList<>(List.of(eBlank))); f.setSeances(new ArrayList<>(List.of(sf)));
        when(enseignantRepository.findAllById(anySet())).thenReturn(List.of(eBlank));
        service.notifyTeachersOfApprovedFormation(f);
        verify(outlookMailService, never()).sendMail(eq("   "), anyString(), anyString());
    }

    @Test @DisplayName("teachersApproved - mail exception caught")
    void teachersApproved_mailEx() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        Enseignant e1 = buildEnseignant("E1", "D", "J", "e@e.tn", "E");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setAnimateurs(new ArrayList<>(List.of(e1))); f.setSeances(new ArrayList<>(List.of(sf)));
        when(enseignantRepository.findAllById(anySet())).thenReturn(List.of(e1));
        doThrow(new RuntimeException("Mail")).when(outlookMailService).sendMail(anyString(), anyString(), anyString());
        assertDoesNotThrow(() -> service.notifyTeachersOfApprovedFormation(f));
    }

    @Test @DisplayName("teachersApproved - with externe formateur (included via collectAllRecipientEmails in state notifications)")
    void teachersApproved_externe() {
        Formation f = buildFormation(1L, EtatFormation.VISIBLE);
        f.setExterneFormateurNom("Durand"); f.setExterneFormateurPrenom("Marie");
        f.setExterneFormateurEmail("marie@ext.com");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        f.setSeances(new ArrayList<>(List.of(sf)));
        service.notifyTeachersOfApprovedFormation(f);
        verify(enseignantRepository, never()).findAllById(anyCollection());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  buildNameByEmail / buildAnimateursLabel branches
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("EN_COURS - seance animateurs in label")
    void enCours_seanceAnim() {
        Formation f = buildFormation(1L, EtatFormation.EN_COURS);
        Enseignant anim = buildEnseignant("A1", "Dup", "Jean", "a@e.tn", "E");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setAnimateurs(new ArrayList<>(List.of(anim))); f.setSeances(new ArrayList<>(List.of(sf)));
        f.setExterneFormateurNom(null);
        service.handleEtatTransitions(f, EtatFormation.PLANIFIE);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("ACHEVE - blank externe formateur name")
    void acheve_blankExterne() {
        Formation f = buildFormation(1L, EtatFormation.ACHEVE);
        f.setExterneFormateurNom("  "); f.setExterneFormateurPrenom(null);
        service.handleEtatTransitions(f, EtatFormation.EN_COURS);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("ACHEVE - seance lines with null salle")
    void acheve_nullSalleSeance() {
        Formation f = buildFormation(1L, EtatFormation.ACHEVE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle(null); f.setSeances(new ArrayList<>(List.of(sf)));
        service.handleEtatTransitions(f, EtatFormation.EN_COURS);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  baseFormationEmailBuilder date branches
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("ENREGISTRE - null dates => 'A definir'")
    void enregistre_nullDates() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setDateDebut(null); f.setDateFin(null);
        Up up = new Up("UP1", "UP"); f.setUp(up);
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("ENREGISTRE - only dateDebut")
    void enregistre_onlyDebut() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setDateFin(null);
        Up up = new Up("UP1", "UP"); f.setUp(up);
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("ENREGISTRE - only dateFin")
    void enregistre_onlyFin() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        f.setDateDebut(null);
        Up up = new Up("UP1", "UP"); f.setUp(up);
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  sendStateNotification branches via handleEtatTransitions
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("stateNotif - mail failure caught")
    void stateNotif_mailFail() {
        Formation f = buildFormation(1L, EtatFormation.ACHEVE);
        doThrow(new RuntimeException("Mail")).when(outlookMailService).sendMail(anyString(), anyString(), anyString());
        assertDoesNotThrow(() -> service.handleEtatTransitions(f, EtatFormation.PLANIFIE));
    }

    @Test @DisplayName("stateNotif - externe formateur name in email")
    void stateNotif_externeName() {
        Formation f = buildFormation(1L, EtatFormation.ACHEVE);
        f.setExterneFormateurNom("Durand"); f.setExterneFormateurPrenom("Marie");
        f.setExterneFormateurEmail("marie@ext.com");
        service.handleEtatTransitions(f, EtatFormation.EN_COURS);
        verify(outlookMailService).sendMail(eq("marie@ext.com"), anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsParDepartement
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("parDept - with seances animateurs participants")
    void parDept_withSeances() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        f.setSeances(new ArrayList<>(List.of(sf)));
        f.setFormationCompetences(new ArrayList<>()); f.setInscriptions(new ArrayList<>());
        when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParDepartement("D1")).hasSize(1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  removeFormationCalendarEvents (via removeFormationCalendarEvents)
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("removeFormationCalendarEvents - null calendar service")
    void removeEvents_nullCal() {
        FormationWorkflowService svcNoCal = serviceWithoutCalendar();
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setCalendarEventId("EVT_1"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        svcNoCal.removeFormationCalendar(f);
        verifyNoInteractions(outlookCalendarService);
    }

    @Test @DisplayName("removeFormationCalendarEvents - empty seances")
    void removeEvents_emptySeances() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        f.setSeances(new ArrayList<>());
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        service.removeFormationCalendar(f);
        verify(outlookCalendarService, never()).deleteEventInCalendar(anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  notifyCUPOfNewFormation branches via handleEtatTransitions
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("cupNew - null UP logs warning")
    void cupNew_nullUp() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE); f.setUp(null);
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        verify(outlookMailService, atMost(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("cupNew - no CUPs found")
    void cupNew_noCups() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        Up up = new Up("UP1", "UP"); f.setUp(up);
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(new ArrayList<>());
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        verify(outlookMailService, atMost(1)).sendMail(anyString(), anyString(), anyString());
    }

    @Test @DisplayName("cupNew - CUP with blank mail skipped")
    void cupNew_blankMail() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        Up up = new Up("UP1", "UP"); f.setUp(up);
        Enseignant cupBlank = buildEnseignant("C1", "D", "J", "  ", "C1"); cupBlank.setCup("O");
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cupBlank));
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        verify(outlookMailService, atMost(1)).sendMail(anyString(), anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  createOrUpdateCalendarEvent branches (new vs update)
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("createOrUpdateEvent - event creation exception caught")
    void createOrUpdateEvent_exception() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle("B201"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any())).thenThrow(new RuntimeException("Graph"));
        assertDoesNotThrow(() -> service.synchronizeFormationCalendar(f));
    }

    @Test @DisplayName("createOrUpdateEvent - salle from formation when seance sala is blank")
    void createOrUpdateEvent_salleFromFormation() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE); f.setSalle("F_SALLE");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle("   "); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    @Test @DisplayName("createOrUpdateEvent - salle null in both seance and formation => Salle-TBD")
    void createOrUpdateEvent_tbdSalle() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE); f.setSalle(null);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle(null); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    @Test @DisplayName("createOrUpdateEvent - update existing with null salle in both")
    void createOrUpdateEvent_updateNullSalle() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE); f.setSalle(null);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle(null); sf.setCalendarEventId("EVT_OLD"); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_OLD", "https://teams"));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).updateEventInCalendarWithTeamsUrl(any());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  buildEventSubject branches
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("buildEventSubject - seance salle is blank, formation salle is blank => Salle-TBD")
    void eventSubject_tbdSalle() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE); f.setSalle(null); f.setTitreFormation("Java");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle("   ");
        sf.setAnimateurs(new ArrayList<>()); f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    @Test @DisplayName("buildEventSubject - animateurs => Animateur-TBD when empty")
    void eventSubject_noAnimateurs() {
        Formation f = buildFormation(1L, EtatFormation.PLANIFIE); f.setTitreFormation("Java");
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setSalle("B201"); sf.setAnimateurs(new ArrayList<>());
        f.setSeances(new ArrayList<>(List.of(sf)));
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(seanceFormationRepository.findById(10L)).thenReturn(Optional.of(sf));
        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT_NEW", null));
        service.synchronizeFormationCalendar(f);
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  sendCancellationEmails branches
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("sendCancellationEmails - mail exception caught per email")
    void cancelMail_exceptionPerEmail() {
        Formation f = buildFormation(1L, EtatFormation.ANNULE);
        SeanceFormation sf = buildSeance(10L, f, LocalDate.of(2026,10,10), LocalTime.of(9,0), LocalTime.of(11,0));
        sf.setCalendarEventId("EVT_1");
        Enseignant e1 = buildEnseignant("E1", "N", "P", "e@e.tn", "E");
        sf.setAnimateurs(new ArrayList<>(List.of(e1)));
        doThrow(new RuntimeException("Mail")).when(outlookMailService).sendMail(anyString(), anyString(), anyString());
        assertDoesNotThrow(() -> service.removeSeanceFromCalendar(sf));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  buildActorAuditDetail branches
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("handleEtat - ENREGISTRE with security context active")
    void handleEtat_securityContext() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        Up up = new Up("UP1", "UP"); f.setUp(up);
        Enseignant cup = buildEnseignant("C1", "D", "J", "c@e.tn", "C1"); cup.setCup("O");
        when(enseignantRepository.findByUpAndCup(up, "O")).thenReturn(List.of(cup));

        org.springframework.security.core.context.SecurityContext ctx =
                org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        org.springframework.security.core.Authentication auth =
                mock(org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("testuser@esprit.tn");
        ctx.setAuthentication(auth);
        org.springframework.security.core.context.SecurityContextHolder.setContext(ctx);

        try {
            service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
            verify(outlookMailService, atLeast(1)).sendMail(anyString(), anyString(), anyString());
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getFormationsParDepartement - ENREGISTRE (should be visible since no filter)
    // ═══════════════════════════════════════════════════════════════════════

    @Test @DisplayName("parDept - null animateurs and participants in seances")
    void parDept_nullAnimPart() {
        Formation f = buildFormation(1L, EtatFormation.ENREGISTRE);
        SeanceFormation sf = new SeanceFormation(); sf.setIdSeance(10L);
        sf.setAnimateurs(null); sf.setParticipants(null);
        f.setSeances(new ArrayList<>(List.of(sf)));
        f.setFormationCompetences(null); f.setInscriptions(null);
        when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParDepartement("D1")).hasSize(1);
    }
}
