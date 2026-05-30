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

import java.lang.reflect.Method;
import java.sql.Time;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowService - Couverture conditions")
class FormationWorkflowServiceCoverageTest {

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
    @Mock private FormationMapper formationMapper;

    @InjectMocks
    private FormationWorkflowService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "formationMapper", formationMapper);
        lenient().when(formationMapper.toResponseDTO(any())).thenReturn(new FormationResponseDTO());
    }

    private Formation createFormation(EtatFormation etat) {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setEtatFormation(etat);
        f.setSeances(new ArrayList<>());
        f.setFormationCompetences(new ArrayList<>());
        f.setInscriptions(new ArrayList<>());
        return f;
    }

    @Test
    @DisplayName("handleEtatTransitions - tous les états")
    void shouldHandleAllEtatTransitions() {
        Formation f = createFormation(EtatFormation.ENREGISTRE);
        service.handleEtatTransitions(f, EtatFormation.NOUVEAU);
        f.setEtatFormation(EtatFormation.PLANIFIE);
        service.handleEtatTransitions(f, EtatFormation.ENREGISTRE);
        f.setEtatFormation(EtatFormation.VISIBLE);
        service.handleEtatTransitions(f, EtatFormation.PLANIFIE);
        f.setEtatFormation(EtatFormation.EN_COURS);
        service.handleEtatTransitions(f, EtatFormation.VISIBLE);
        f.setEtatFormation(EtatFormation.ACHEVE);
        service.handleEtatTransitions(f, EtatFormation.EN_COURS);
        f.setEtatFormation(EtatFormation.ANNULE);
        service.handleEtatTransitions(f, EtatFormation.ENREGISTRE);
    }

    @Test
    @DisplayName("handleEtatTransitions - même état ne fait rien")
    void shouldSkipWhenSameEtat() {
        Formation f = createFormation(EtatFormation.PLANIFIE);
        service.handleEtatTransitions(f, EtatFormation.PLANIFIE);
        verifyNoInteractions(outlookMailService);
    }

    @Test
    @DisplayName("handleEtatTransitions - état null")
    void shouldHandleNullEtat() {
        Formation f = createFormation(null);
        service.handleEtatTransitions(f, EtatFormation.PLANIFIE);
    }

    @Test
    @DisplayName("sendEmailsSafely - outlookMailService null")
    void shouldSkipWhenMailServiceNull() {
        FormationWorkflowService svc = new FormationWorkflowService(
                documentRepository, formationRepository, seanceFormationRepository,
                enseignantRepository, presenceRepository, departementRepository,
                upRepository, evaluationPublisher, helper, formationMapper,
                outlookCalendarService, null);
        ReflectionTestUtils.setField(svc, "formationMapper", formationMapper);
        Formation f = createFormation(EtatFormation.PLANIFIE);
        f.setSeances(new ArrayList<>());
        Method m = null;
        try {
            m = FormationWorkflowService.class.getDeclaredMethod("sendEmailsSafely", Set.class, String.class, String.class);
            m.setAccessible(true);
            m.invoke(svc, Set.of("test@test.com"), "Subject", "<html></html>");
        } catch (Exception ignored) {}
    }

    @Test
    @DisplayName("collectAllRecipientEmails - formation avec animateurs et seances")
    void shouldCollectAllEmails() throws Exception {
        Formation f = createFormation(EtatFormation.PLANIFIE);
        Enseignant anim = new Enseignant();
        anim.setId("A1");
        anim.setMail("anim@esprit.tn");
        f.setAnimateurs(new ArrayList<>(List.of(anim)));

        SeanceFormation sf = new SeanceFormation();
        Enseignant part = new Enseignant();
        part.setId("P1");
        part.setMail("part@esprit.tn");
        sf.setAnimateurs(List.of(anim));
        sf.setParticipants(List.of(part));
        f.setSeances(List.of(sf));
        f.setExterneFormateurEmail("ext@test.com");

        Method m = FormationWorkflowService.class.getDeclaredMethod("collectAllRecipientEmails", Formation.class);
        m.setAccessible(true);
        @SuppressWarnings("unchecked")
        Set<String> emails = (Set<String>) m.invoke(service, f);
        assertThat(emails).contains("anim@esprit.tn", "part@esprit.tn", "ext@test.com");
    }

    @Test
    @DisplayName("collectAllRecipientEmails - formation sans seances ni animateurs")
    void shouldCollectEmailsWithNulls() throws Exception {
        Formation f = createFormation(EtatFormation.PLANIFIE);
        f.setAnimateurs(null);
        f.setSeances(null);
        f.setExterneFormateurEmail(null);

        Method m = FormationWorkflowService.class.getDeclaredMethod("collectAllRecipientEmails", Formation.class);
        m.setAccessible(true);
        @SuppressWarnings("unchecked")
        Set<String> emails = (Set<String>) m.invoke(service, f);
        assertThat(emails).isNotEmpty();
    }

    @Test
    @DisplayName("buildStateNotificationHtml - avec seances et animateurs")
    void shouldBuildHtmlWithSeances() throws Exception {
        Formation f = createFormation(EtatFormation.PLANIFIE);
        SeanceFormation sf = new SeanceFormation();
        sf.setDateSeance(new Date());
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setSalle("S1");
        Enseignant anim = new Enseignant();
        anim.setNom("Nom");
        anim.setPrenom("Prenom");
        sf.setAnimateurs(List.of(anim));
        f.setSeances(List.of(sf));
        f.setExterneFormateurNom("Ext");
        f.setExterneFormateurPrenom("Nom");

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildStateNotificationHtml",
                Formation.class, String.class, String.class, String.class);
        m.setAccessible(true);
        String html = (String) m.invoke(service, f, "Title", "Message", "#1565c0");
        assertThat(html).contains("Title").contains("S1").contains("Ext Nom");
    }

    @Test
    @DisplayName("buildStateNotificationHtml - sans seances")
    void shouldBuildHtmlWithoutSeances() throws Exception {
        Formation f = createFormation(EtatFormation.PLANIFIE);
        f.setSeances(new ArrayList<>());
        f.setExterneFormateurNom(null);

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildStateNotificationHtml",
                Formation.class, String.class, String.class, String.class);
        m.setAccessible(true);
        String html = (String) m.invoke(service, f, "Title", "Message", "#1565c0");
        assertThat(html).contains("Title");
    }

    @Test
    @DisplayName("buildApprovalNotificationHtml - avec seances")
    void shouldBuildApprovalHtml() throws Exception {
        Formation f = createFormation(EtatFormation.VISIBLE);
        SeanceFormation sf = new SeanceFormation();
        sf.setDateSeance(new Date());
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setSalle("S1");
        f.setSeances(List.of(sf));

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildApprovalNotificationHtml", Formation.class);
        m.setAccessible(true);
        String html = (String) m.invoke(service, f);
        assertThat(html).contains("S1");
    }

    @Test
    @DisplayName("buildApprovalNotificationHtml - sans seances")
    void shouldBuildApprovalHtmlEmpty() throws Exception {
        Formation f = createFormation(EtatFormation.VISIBLE);
        f.setSeances(new ArrayList<>());

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildApprovalNotificationHtml", Formation.class);
        m.setAccessible(true);
        String html = (String) m.invoke(service, f);
        assertThat(html).isNotEmpty();
    }

    @Test
    @DisplayName("formatDate et formatTime avec null")
    void shouldFormatNullDates() throws Exception {
        Method fmtDate = FormationWorkflowService.class.getDeclaredMethod("formatDate", Date.class);
        fmtDate.setAccessible(true);
        assertThat((String) fmtDate.invoke(service, (Date) null)).isNotEmpty();

        Method fmtTime = FormationWorkflowService.class.getDeclaredMethod("formatTime", Time.class);
        fmtTime.setAccessible(true);
        assertThat((String) fmtTime.invoke(service, (Time) null)).isNotEmpty();
    }

    @Test
    @DisplayName("adjustBrightness - cas valides et invalides")
    void shouldAdjustBrightness() throws Exception {
        Method m = FormationWorkflowService.class.getDeclaredMethod("adjustBrightness", String.class, int.class);
        m.setAccessible(true);
        String result = (String) m.invoke(service, "#ff0000", -20);
        assertThat(result).startsWith("#");
        String result2 = (String) m.invoke(service, "#invalid", 10);
        assertThat(result2).isEqualTo("#invalid");
    }

    @Test
    @DisplayName("buildCalendarEventContent")
    void shouldBuildCalendarContent() throws Exception {
        Formation f = createFormation(EtatFormation.PLANIFIE);
        SeanceFormation sf = new SeanceFormation();
        sf.setDateSeance(new Date());
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setSalle("S1");

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildCalendarEventContent",
                Formation.class, SeanceFormation.class, String.class);
        m.setAccessible(true);
        String html = (String) m.invoke(service, f, sf, "Animateur");
        assertThat(html).contains("S1").contains("Animateur");
    }

    @Test
    @DisplayName("notifyTeachersOfApprovedFormation - null mailService")
    void shouldNotNotifyWhenMailServiceNull() {
        Formation f = createFormation(EtatFormation.VISIBLE);
        FormationWorkflowService svc = new FormationWorkflowService(
                documentRepository, formationRepository, seanceFormationRepository,
                enseignantRepository, presenceRepository, departementRepository,
                upRepository, evaluationPublisher, helper, formationMapper,
                outlookCalendarService, null);
        svc.notifyTeachersOfApprovedFormation(f);
        verifyNoInteractions(enseignantRepository);
    }

    @Test
    @DisplayName("notifyCUPOfApprovedFormation - null mailService")
    void shouldNotNotifyCUPWhenMailServiceNull() {
        Formation f = createFormation(EtatFormation.VISIBLE);
        FormationWorkflowService svc = new FormationWorkflowService(
                documentRepository, formationRepository, seanceFormationRepository,
                enseignantRepository, presenceRepository, departementRepository,
                upRepository, evaluationPublisher, helper, formationMapper,
                outlookCalendarService, null);
        svc.notifyCUPOfApprovedFormation(f);
    }

    @Test
    @DisplayName("notifyCUPOfApprovedFormation - null up")
    void shouldNotNotifyCUPWhenUpNull() {
        Formation f = createFormation(EtatFormation.VISIBLE);
        f.setUp(null);
        service.notifyCUPOfApprovedFormation(f);
        verifyNoInteractions(enseignantRepository);
    }

    @Test
    @DisplayName("notifyCUPOfNewFormation - null up et null mailService")
    void shouldNotNotifyNewFormationWhenNulls() throws Exception {
        Formation f = createFormation(EtatFormation.ENREGISTRE);
        f.setUp(null);
        Method m = FormationWorkflowService.class.getDeclaredMethod("notifyCUPOfNewFormation", Formation.class);
        m.setAccessible(true);
        m.invoke(service, f);
    }

    @Test
    @DisplayName("getFormationsByAnimateurEmail - avec seances")
    void shouldGetByAnimateurEmail() {
        Formation f = createFormation(EtatFormation.EN_COURS);
        SeanceFormation sf = new SeanceFormation();
        sf.setAnimateurs(new ArrayList<>());
        sf.setParticipants(new ArrayList<>());
        f.setSeances(List.of(sf));
        when(formationRepository.findDistinctBySeancesAnimateursMail("a@t.tn")).thenReturn(List.of(f));
        List<FormationResponseDTO> result = service.getFormationsByAnimateurEmail("a@t.tn");
        assertThat(result).isNotEmpty();
    }

    @Test
    @DisplayName("getPresencesBySeance - seance sans presences")
    void shouldReturnEmptyPresences() {
        SeanceFormation sf = new SeanceFormation();
        sf.setPresences(null);
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        List<PresenceDTO> result = service.getPresencesBySeance(1L);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getPresencesBySeance - avec presences")
    void shouldReturnPresences() {
        SeanceFormation sf = new SeanceFormation();
        Enseignant e = new Enseignant();
        e.setId("E1");
        e.setNom("N");
        e.setPrenom("P");
        Presence p = new Presence();
        p.setIdParticipation(1L);
        p.setPresent(true);
        p.setEnseignant(e);
        sf.setPresences(List.of(p));
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));
        List<PresenceDTO> result = service.getPresencesBySeance(1L);
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getAllFormationsWithDocuments")
    void shouldGetAllWithDocs() {
        Formation f = createFormation(EtatFormation.ENREGISTRE);
        when(formationRepository.findAll()).thenReturn(List.of(f));
        when(documentRepository.findByFormation_IdFormation(1L)).thenReturn(new ArrayList<>());
        List<FormationWithDocumentsDTO> result = service.getAllFormationsWithDocuments();
        assertThat(result).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsForCalendar")
    void shouldGetForCalendar() {
        when(formationRepository.findDistinctBySeances_Animateurs_Id("E1")).thenReturn(new ArrayList<>());
        when(formationRepository.findDistinctBySeances_Participants_Id("E1")).thenReturn(new ArrayList<>());
        FormationsByRoleDTO result = service.getFormationsForCalendar("E1");
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("updatePresence - succès et échec")
    void shouldUpdatePresence() {
        Presence p = new Presence();
        p.setIdParticipation(1L);
        when(presenceRepository.findById(1L)).thenReturn(Optional.of(p));
        service.updatePresence(1L, true, "OK");
        assertThat(p.isPresent()).isTrue();

        when(presenceRepository.findById(999L)).thenReturn(Optional.empty());
        try { service.updatePresence(999L, true, "OK"); } catch (IllegalArgumentException ignored) {}
    }

    @Test
    @DisplayName("setInscriptionsOuvertes")
    void shouldSetInscriptions() {
        Formation f = createFormation(EtatFormation.VISIBLE);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        when(formationRepository.save(any())).thenReturn(f);
        FormationResponseDTO result = service.setInscriptionsOuvertes(1L, true);
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("getFormationsVisibles")
    void shouldGetVisibles() {
        Formation f = createFormation(EtatFormation.VISIBLE);
        when(formationRepository.findAll()).thenReturn(List.of(f));
        List<FormationResponseDTO> result = service.getFormationsVisibles();
        assertThat(result).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsParUp et Departement")
    void shouldGetByUpAndDept() {
        Formation f = createFormation(EtatFormation.VISIBLE);
        when(formationRepository.findByUp_Id("UP1")).thenReturn(List.of(f));
        when(formationRepository.findByDepartement_Id("D1")).thenReturn(List.of(f));
        assertThat(service.getFormationsParUp("UP1")).isNotEmpty();
        assertThat(service.getFormationsParDepartement("D1")).isNotEmpty();
    }

    @Test
    @DisplayName("getFormationsAchevees")
    void shouldGetAchevees() {
        Formation f = createFormation(EtatFormation.ACHEVE);
        when(formationRepository.findByEtatFormation(EtatFormation.ACHEVE)).thenReturn(List.of(f));
        assertThat(service.getFormationsAchevees()).isNotEmpty();
    }

    @Test
    @DisplayName("deleteFormationWorkflow - introuvable")
    void shouldFailDeleteNotFound() {
        when(formationRepository.findById(999L)).thenReturn(Optional.empty());
        try { service.deleteFormationWorkflow(999L); } catch (IllegalArgumentException ignored) {}
    }
}
