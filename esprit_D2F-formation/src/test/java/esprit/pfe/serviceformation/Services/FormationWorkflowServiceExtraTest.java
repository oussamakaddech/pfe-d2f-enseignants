package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookEventParameters;
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
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowService - Tests supplémentaires")
class FormationWorkflowServiceExtraTest {

    @Mock private FormationRepository formationRepository;
    @Mock private SeanceFormationRepository seanceFormationRepository;
    @Mock private EnseignantRepository enseignantRepository;
    @Mock private DeptRepository departementRepository;
    @Mock private UpRepository upRepository;
    @Mock private AnimateurExterneRepository animateurExterneRepository;
    @Mock private EvaluationPublisher evaluationPublisher;
    @Mock private OutlookCalendarService outlookCalendarService;
    @Mock private OutlookMailService outlookMailService;
    @Mock private PresenceRepository presenceRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private FormationWorkflowServiceHelper helper;
    @Mock private FormationMapper formationMapper;
    @Mock private AnimateurParticipantResolver animateurParticipantResolver;
    @Mock private EmailAuditLogRepository emailAuditLogRepository;

    @InjectMocks
    private FormationWorkflowService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "organizerEmail", "org@esprit.tn");
        ReflectionTestUtils.setField(service, "platformUrl", "https://d2f.esprit.tn");
        ReflectionTestUtils.setField(service, "formationsPath", "/formations/");
    }

    // ─── updateFormationBasicFields ──────────────────────────────────────

    private FormationWorkflowRequest buildFullRequest() {
        FormationWorkflowRequest request = new FormationWorkflowRequest();
        request.setTitreFormation("Java Avancé");
        request.setDateDebut(new Date(1000));
        request.setDateFin(new Date(2000));
        request.setTypeFormation(TypeFormation.EXTERNE);
        request.setExterneFormateurNom("Dupont");
        request.setExterneFormateurPrenom("Jean");
        request.setExterneFormateurEmail("dupont@test.com");
        request.setEtatFormation(EtatFormation.PLANIFIE);
        request.setCoutFormation(5000f);
        request.setOrganismeRefExterne("ESPRIT");
        request.setBureauFormationNom("Bureau A");
        request.setBureauFormationMail("bureau@test.com");
        request.setBureauFormationTelephone("71123456");
        request.setChargeHoraireGlobal(40);
        request.setDomaine("IT");
        request.setCompetence("Java");
        request.setPopulationCible("Ingénieurs");
        request.setObjectifs("Maîtriser Spring");
        request.setObjectifsPedago("TP sur projets");
        request.setEvalMethods("QCM");
        request.setPrerequis("Java basique");
        request.setAcquis("Certification");
        request.setIndicateurs("Taux de réussite");
        request.setCoutTransport(200f);
        request.setCoutHebergement(300f);
        request.setCoutRepas(100f);
        request.setOuverte(true);
        request.setSalle("B201");
        request.setResponsableEmail("resp@test.com");
        request.setResponsableName("Resp Nom");
        request.setCustomPeriodLabel("S1 2026");
        Enseignant anim1 = new Enseignant();
        anim1.setId("A1");
        Enseignant anim2 = new Enseignant();
        anim2.setId("A2");
        lenient().when(enseignantRepository.findById("A1")).thenReturn(Optional.of(anim1));
        lenient().when(enseignantRepository.findById("A2")).thenReturn(Optional.of(anim2));
        request.setAnimateursIds(List.of("A1", "A2"));
        AnimateurExterne extAnim = new AnimateurExterne();
        extAnim.setId(10L);
        lenient().when(animateurExterneRepository.findById(10L)).thenReturn(Optional.of(extAnim));
        request.setAnimateursExternesIds(List.of(10L));
        return request;
    }

    @Test
    @DisplayName("updateFormationBasicFields - champs texte et enums copiés")
    void shouldCopyTextFields() {
        Formation formation = new Formation();
        invokeUpdateFormationBasicFields(formation, buildFullRequest());
        assertThat(formation.getTitreFormation()).isEqualTo("Java Avancé");
        assertThat(formation.getDateDebut()).isEqualTo(new Date(1000));
        assertThat(formation.getDateFin()).isEqualTo(new Date(2000));
        assertThat(formation.getTypeFormation()).isEqualTo(TypeFormation.EXTERNE);
        assertThat(formation.getEtatFormation()).isEqualTo(EtatFormation.PLANIFIE);
    }

    @Test
    @DisplayName("updateFormationBasicFields - champs externes et coût copiés")
    void shouldCopyCostFields() {
        Formation formation = new Formation();
        invokeUpdateFormationBasicFields(formation, buildFullRequest());
        assertThat(formation.getExterneFormateurNom()).isEqualTo("Dupont");
        assertThat(formation.getExterneFormateurPrenom()).isEqualTo("Jean");
        assertThat(formation.getExterneFormateurEmail()).isEqualTo("dupont@test.com");
        assertThat(formation.getCoutFormation()).isEqualTo(5000f);
        assertThat(formation.getOrganismeRefExterne()).isEqualTo("ESPRIT");
    }

    @Test
    @DisplayName("updateFormationBasicFields - domaine et compétences copiés")
    void shouldCopyDomaineFields() {
        Formation formation = new Formation();
        invokeUpdateFormationBasicFields(formation, buildFullRequest());
        assertThat(formation.getBureauFormationNom()).isEqualTo("Bureau A");
        assertThat(formation.getBureauFormationMail()).isEqualTo("bureau@test.com");
        assertThat(formation.getBureauFormationTelephone()).isEqualTo("71123456");
        assertThat(formation.getChargeHoraireGlobal()).isEqualTo(40);
        assertThat(formation.getDomaine()).isEqualTo("IT");
    }

    @Test
    @DisplayName("updateFormationBasicFields - pédagogie copiée")
    void shouldCopyPedagogyFields() {
        Formation formation = new Formation();
        invokeUpdateFormationBasicFields(formation, buildFullRequest());
        assertThat(formation.getCompetence()).isEqualTo("Java");
        assertThat(formation.getPopulationCible()).isEqualTo("Ingénieurs");
        assertThat(formation.getObjectifs()).isEqualTo("Maîtriser Spring");
        assertThat(formation.getObjectifsPedago()).isEqualTo("TP sur projets");
        assertThat(formation.getEvalMethods()).isEqualTo("QCM");
    }

    @Test
    @DisplayName("updateFormationBasicFields - coûts annexes copiés")
    void shouldCopyExtraCostFields() {
        Formation formation = new Formation();
        invokeUpdateFormationBasicFields(formation, buildFullRequest());
        assertThat(formation.getPrerequis()).isEqualTo("Java basique");
        assertThat(formation.getAcquis()).isEqualTo("Certification");
        assertThat(formation.getIndicateurs()).isEqualTo("Taux de réussite");
        assertThat(formation.getCoutTransport()).isEqualTo(200f);
        assertThat(formation.getCoutHebergement()).isEqualTo(300f);
    }

    @Test
    @DisplayName("updateFormationBasicFields - salle et responsable copiés")
    void shouldCopySalleFields() {
        Formation formation = new Formation();
        invokeUpdateFormationBasicFields(formation, buildFullRequest());
        assertThat(formation.getCoutRepas()).isEqualTo(100f);
        assertThat(formation.isOuverte()).isTrue();
        assertThat(formation.getSalle()).isEqualTo("B201");
        assertThat(formation.getResponsableEmail()).isEqualTo("resp@test.com");
        assertThat(formation.getResponsableName()).isEqualTo("Resp Nom");
    }

    @Test
    @DisplayName("updateFormationBasicFields - périodes et listes copiées")
    void shouldCopyPeriodAndLists() {
        Formation formation = new Formation();
        invokeUpdateFormationBasicFields(formation, buildFullRequest());
        assertThat(formation.getCustomPeriodLabel()).isEqualTo("S1 2026");
        assertThat(formation.getAnimateurs()).hasSize(2);
        assertThat(formation.getAnimateursExternes()).hasSize(1);
    }

    @Test
    @DisplayName("updateFormationBasicFields - periodCode invalide bascule sur OTHER")
    void shouldFallbackToOtherOnInvalidPeriodCode() {
        Formation formation = new Formation();
        FormationWorkflowRequest request = new FormationWorkflowRequest();
        request.setPeriodCode("DOES_NOT_EXIST");

        invokeUpdateFormationBasicFields(formation, request);

        assertThat(formation.getPeriodCode()).isEqualTo(PeriodCode.OTHER);
    }

    @Test
    @DisplayName("updateFormationBasicFields - periodCode valide")
    void shouldSetValidPeriodCode() {
        Formation formation = new Formation();
        FormationWorkflowRequest request = new FormationWorkflowRequest();
        request.setPeriodCode("WINTER");

        invokeUpdateFormationBasicFields(formation, request);

        assertThat(formation.getPeriodCode()).isEqualTo(PeriodCode.WINTER);
    }

    @Test
    @DisplayName("updateFormationBasicFields - null animateursIds ne modifie pas la liste")
    void shouldNotTouchAnimateursWhenNull() {
        Formation formation = new Formation();
        formation.setAnimateurs(new ArrayList<>());
        FormationWorkflowRequest request = new FormationWorkflowRequest();
        request.setAnimateursIds(null);

        invokeUpdateFormationBasicFields(formation, request);

        assertThat(formation.getAnimateurs()).isEmpty();
    }

    @Test
    @DisplayName("updateFormationBasicFields - null animateursExternesIds ne modifie pas la liste")
    void shouldNotTouchAnimateursExternesWhenNull() {
        Formation formation = new Formation();
        formation.setAnimateursExternes(new ArrayList<>());
        FormationWorkflowRequest request = new FormationWorkflowRequest();
        request.setAnimateursExternesIds(null);

        invokeUpdateFormationBasicFields(formation, request);

        assertThat(formation.getAnimateursExternes()).isEmpty();
    }

    @Test
    @DisplayName("updateFormationBasicFields - animateurs non trouvés filtrés silencieusement")
    void shouldFilterOutMissingAnimateurs() {
        Formation formation = new Formation();
        FormationWorkflowRequest request = new FormationWorkflowRequest();
        request.setAnimateursIds(List.of("MISSING1", "MISSING2"));
        lenient().when(enseignantRepository.findById("MISSING1")).thenReturn(Optional.empty());
        lenient().when(enseignantRepository.findById("MISSING2")).thenReturn(Optional.empty());

        invokeUpdateFormationBasicFields(formation, request);

        assertThat(formation.getAnimateurs()).isEmpty();
    }

    // ─── buildAnimateursString ────────────────────────────────────────────

    @Test
    @DisplayName("buildAnimateursString - seance avec animateurs et formation avec externe")
    void shouldBuildAnimateursStringWithExterne() throws Exception {
        Formation f = new Formation();
        f.setExterneFormateurNom("Martin");
        f.setExterneFormateurPrenom("Paul");

        SeanceFormation sf = new SeanceFormation();
        Enseignant a1 = new Enseignant();
        a1.setNom("Dupont");
        a1.setPrenom("Jean");
        Enseignant a2 = new Enseignant();
        a2.setNom("Durand");
        a2.setPrenom("Marie");
        sf.setAnimateurs(List.of(a1, a2));

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildAnimateursString",
                SeanceFormation.class, Formation.class);
        m.setAccessible(true);
        String result = (String) m.invoke(service, sf, f);

        assertThat(result).contains("Dupont Jean").contains("Durand Marie").contains("Martin Paul");
    }

    @Test
    @DisplayName("buildAnimateursString - seance sans animateurs, uniquement externe")
    void shouldBuildAnimateursStringOnlyExterne() throws Exception {
        Formation f = new Formation();
        f.setExterneFormateurNom("Solo");
        f.setExterneFormateurPrenom("Jean");

        SeanceFormation sf = new SeanceFormation();
        sf.setAnimateurs(null);

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildAnimateursString",
                SeanceFormation.class, Formation.class);
        m.setAccessible(true);
        String result = (String) m.invoke(service, sf, f);

        assertThat(result).isEqualTo("Solo Jean");
    }

    @Test
    @DisplayName("buildAnimateursString - pas d'externe si nom null ou blank")
    void shouldNotAppendExterneWhenBlank() throws Exception {
        Formation f = new Formation();
        f.setExterneFormateurNom("   ");
        f.setExterneFormateurPrenom("Paul");

        SeanceFormation sf = new SeanceFormation();
        Enseignant a = new Enseignant();
        a.setNom("Dupont");
        a.setPrenom("Jean");
        sf.setAnimateurs(List.of(a));

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildAnimateursString",
                SeanceFormation.class, Formation.class);
        m.setAccessible(true);
        String result = (String) m.invoke(service, sf, f);

        assertThat(result).isEqualTo("Dupont Jean");
    }

    // ─── buildEventSubject ────────────────────────────────────────────────

    @Test
    @DisplayName("buildEventSubject - salle dans la séance")
    void shouldUseSeanceSalleInSubject() throws Exception {
        SeanceFormation sf = new SeanceFormation();
        sf.setSalle("B201");

        Formation f = new Formation();
        f.setTitreFormation("Java");
        f.setSalle(null);

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildEventSubject",
                SeanceFormation.class, Formation.class, String.class);
        m.setAccessible(true);
        String result = (String) m.invoke(service, sf, f, "Jean Dupont");

        assertThat(result).isEqualTo("D2f-B201-Java-Jean Dupont");
    }

    @Test
    @DisplayName("buildEventSubject - salle dans la formation quand séance n'en a pas")
    void shouldFallbackToFormationSalle() throws Exception {
        SeanceFormation sf = new SeanceFormation();
        sf.setSalle(null);

        Formation f = new Formation();
        f.setTitreFormation("Spring");
        f.setSalle("A100");

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildEventSubject",
                SeanceFormation.class, Formation.class, String.class);
        m.setAccessible(true);
        String result = (String) m.invoke(service, sf, f, "Marie Durand");

        assertThat(result).isEqualTo("D2f-A100-Spring-Marie Durand");
    }

    @Test
    @DisplayName("buildEventSubject - aucune salle définie, fallback Salle-TBD")
    void shouldFallbackToSalleTBD() throws Exception {
        SeanceFormation sf = new SeanceFormation();
        sf.setSalle(null);

        Formation f = new Formation();
        f.setTitreFormation(null);
        f.setSalle(null);

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildEventSubject",
                SeanceFormation.class, Formation.class, String.class);
        m.setAccessible(true);
        String result = (String) m.invoke(service, sf, f, null);

        assertThat(result).isEqualTo("D2f-Salle-TBD-Formation-Animateur-TBD");
    }

    // ─── buildEmailsSet ───────────────────────────────────────────────────

    @Test
    @DisplayName("buildEmailsSet - collecte tous les emails animateurs participants externe organizer")
    void shouldCollectAllEmails() throws Exception {
        SeanceFormation sf = new SeanceFormation();
        Enseignant anim = new Enseignant();
        anim.setMail("anim@esprit.tn");
        Enseignant part = new Enseignant();
        part.setMail("part@esprit.tn");
        sf.setAnimateurs(List.of(anim));
        sf.setParticipants(List.of(part));

        Formation f = new Formation();
        f.setExterneFormateurEmail("ext@test.com");

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildEmailsSet",
                SeanceFormation.class, Formation.class);
        m.setAccessible(true);
        @SuppressWarnings("unchecked")
        Set<String> emails = (Set<String>) m.invoke(service, sf, f);

        assertThat(emails).contains("anim@esprit.tn", "part@esprit.tn", "ext@test.com", "org@esprit.tn");
    }

    @Test
    @DisplayName("buildEmailsSet - animateurs et participants null")
    void shouldHandleNullAnimateursAndParticipants() throws Exception {
        SeanceFormation sf = new SeanceFormation();
        sf.setAnimateurs(null);
        sf.setParticipants(null);

        Formation f = new Formation();
        f.setExterneFormateurEmail(null);

        Method m = FormationWorkflowService.class.getDeclaredMethod("buildEmailsSet",
                SeanceFormation.class, Formation.class);
        m.setAccessible(true);
        @SuppressWarnings("unchecked")
        Set<String> emails = (Set<String>) m.invoke(service, sf, f);

        assertThat(emails).containsExactly("org@esprit.tn");
    }

    // ─── removeFormationCalendarEvents ────────────────────────────────────

    @Test
    @DisplayName("removeFormationCalendarEvents - outlookCalendarService null fait log et retourne")
    void shouldSkipWhenCalendarServiceNull() {
        FormationWorkflowService svc = createServiceWithNullOutlook();
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setSeances(new ArrayList<>());

        Method m = findMethod("removeFormationCalendarEvents", Formation.class);
        assertDoesNotThrow(() -> m.invoke(svc, f));
    }

    @Test
    @DisplayName("removeFormationCalendarEvents - seance null calendarEventId ignorée")
    void shouldSkipSeanceWithNullEventId() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setCalendarEventId(null);
        f.setSeances(List.of(sf));

        Method m = findMethod("removeFormationCalendarEvents", Formation.class);
        assertDoesNotThrow(() -> m.invoke(service, f));
        verify(outlookCalendarService, never()).deleteEventInCalendar(anyString(), anyString());
    }

    @Test
    @DisplayName("removeFormationCalendarEvents - seance avec eventId supprimée")
    void shouldDeleteEventWhenEventIdPresent() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setCalendarEventId("EVT-123");
        f.setSeances(List.of(sf));

        Method m = findMethod("removeFormationCalendarEvents", Formation.class);
        assertDoesNotThrow(() -> m.invoke(service, f));
        verify(outlookCalendarService).deleteEventInCalendar("org@esprit.tn", "EVT-123");
    }

    @Test
    @DisplayName("removeFormationCalendarEvents - formation avec seances null")
    void shouldHandleNullSeances() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setSeances(null);

        Method m = findMethod("removeFormationCalendarEvents", Formation.class);
        assertDoesNotThrow(() -> m.invoke(service, f));
    }

    // ─── removeFormationCalendar ──────────────────────────────────────────

    @Test
    @DisplayName("removeFormationCalendar - avec outlookMailService et outlookCalendarService")
    void shouldSendCancellationEmailsAndDeleteEvents() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Java");
        f.setDateDebut(new Date());
        f.setDateFin(new Date());

        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setCalendarEventId("EVT-456");
        sf.setDateSeance(new Date());
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        Enseignant anim = new Enseignant();
        anim.setMail("anim@test.com");
        sf.setAnimateurs(List.of(anim));
        sf.setParticipants(new ArrayList<>());
        sf.setFormation(f);
        f.setSeances(List.of(sf));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));

        Method m = findMethod("removeFormationCalendar", Formation.class);
        assertDoesNotThrow(() -> m.invoke(service, f));

        verify(outlookMailService, atLeastOnce()).sendMail(anyString(), anyString(), anyString());
        verify(outlookCalendarService).deleteEventInCalendar("org@esprit.tn", "EVT-456");
    }

    @Test
    @DisplayName("removeFormationCalendar - outlookCalendarService null ne supprime pas")
    void shouldNotDeleteEventsWhenCalendarServiceNull() {
        FormationWorkflowService svc = createServiceWithNullOutlook();
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("Test");
        f.setDateDebut(new Date());
        f.setDateFin(new Date());
        f.setSeances(new ArrayList<>());

        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));

        Method m = findMethod("removeFormationCalendar", Formation.class);
        assertDoesNotThrow(() -> m.invoke(svc, f));
    }

    // ─── batchUpdatePresences ─────────────────────────────────────────────

    @Test
    @DisplayName("batchUpdatePresences - null request retourne les presences existantes")
    void shouldReturnPresencesWhenRequestIsNull() {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(1L);
        Presence p = new Presence();
        p.setIdParticipation(10L);
        p.setPresent(false);
        sf.setPresences(List.of(p));
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));

        List<PresenceDTO> result = service.batchUpdatePresences(1L, null);

        assertThat(result).hasSize(1);
        verify(presenceRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("batchUpdatePresences - updates vide retourne les presences existantes")
    void shouldReturnPresencesWhenUpdatesEmpty() {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(1L);
        sf.setPresences(new ArrayList<>());
        when(seanceFormationRepository.findById(1L)).thenReturn(Optional.of(sf));

        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest();
        req.setUpdates(new ArrayList<>());

        List<PresenceDTO> result = service.batchUpdatePresences(1L, req);

        assertThat(result).isEmpty();
        verify(presenceRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("batchUpdatePresences - met à jour les presences correspondantes")
    void shouldUpdateMatchingPresences() {
        Presence p1 = new Presence();
        p1.setIdParticipation(10L);
        p1.setPresent(false);
        p1.setCommentaire("ancien");

        Presence p2 = new Presence();
        p2.setIdParticipation(20L);
        p2.setPresent(true);

        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p1, p2));

        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest();
        BatchPresenceUpdateRequest.Item item = new BatchPresenceUpdateRequest.Item();
        item.setIdParticipation(10L);
        item.setPresent(true);
        item.setCommentaire("Corrigé");
        req.setUpdates(List.of(item));

        service.batchUpdatePresences(1L, req);

        assertThat(p1.isPresent()).isTrue();
        assertThat(p1.getCommentaire()).isEqualTo("Corrigé");
        assertThat(p2.isPresent()).isTrue();
        verify(presenceRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("batchUpdatePresences - skip item null et idParticipation null")
    void shouldSkipNullItemsAndNullIds() {
        Presence p1 = new Presence();
        p1.setIdParticipation(10L);
        p1.setPresent(false);
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p1));

        BatchPresenceUpdateRequest req = new BatchPresenceUpdateRequest();
        BatchPresenceUpdateRequest.Item nullIdItem = new BatchPresenceUpdateRequest.Item();
        nullIdItem.setIdParticipation(null);
        nullIdItem.setPresent(true);
        java.util.ArrayList<BatchPresenceUpdateRequest.Item> items = new java.util.ArrayList<>();
        items.add(nullIdItem);
        items.add(null);
        req.setUpdates(items);

        service.batchUpdatePresences(1L, req);

        assertThat(p1.isPresent()).isFalse();
        verify(presenceRepository).saveAll(anyList());
    }

    // ─── markAllPresences ─────────────────────────────────────────────────

    @Test
    @DisplayName("markAllPresences - marque toutes les presences comme présentes et met le commentaire")
    void shouldMarkAllAsPresentAndFixCommentaire() {
        Presence p1 = new Presence();
        p1.setIdParticipation(10L);
        p1.setPresent(false);
        p1.setCommentaire("Presence a valider");

        Presence p2 = new Presence();
        p2.setIdParticipation(20L);
        p2.setPresent(false);
        p2.setCommentaire(null);

        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p1, p2));

        service.markAllPresences(1L, true);

        assertThat(p1.isPresent()).isTrue();
        assertThat(p1.getCommentaire()).isEqualTo("Presence confirmee");
        assertThat(p2.isPresent()).isTrue();
        assertThat(p2.getCommentaire()).isEqualTo("Presence confirmee");
        verify(presenceRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("markAllPresences - marque toutes les presences comme absentes")
    void shouldMarkAllAsAbsent() {
        Presence p1 = new Presence();
        p1.setIdParticipation(10L);
        p1.setPresent(true);
        p1.setCommentaire("OK");

        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p1));

        service.markAllPresences(1L, false);

        assertThat(p1.isPresent()).isFalse();
        assertThat(p1.getCommentaire()).isEqualTo("OK");
        verify(presenceRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("markAllPresences - commentaire déjà renseigné non écrasé")
    void shouldNotOverwriteExistingCommentaire() {
        Presence p1 = new Presence();
        p1.setIdParticipation(10L);
        p1.setPresent(false);
        p1.setCommentaire("Déjà commenté");

        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p1));

        service.markAllPresences(1L, true);

        assertThat(p1.isPresent()).isTrue();
        assertThat(p1.getCommentaire()).isEqualTo("Déjà commenté");
    }

    @Test
    @DisplayName("markAllPresences - liste vide")
    void shouldHandleEmptyList() {
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>());

        List<PresenceDTO> result = service.markAllPresences(1L, true);

        assertThat(result).isEmpty();
    }

    // ─── getSeancePresenceStats ───────────────────────────────────────────

    @Test
    @DisplayName("getSeancePresenceStats - calcule taux correctement")
    void shouldCalculatePresenceStats() {
        Presence p1 = new Presence();
        p1.setPresent(true);
        Presence p2 = new Presence();
        p2.setPresent(true);
        Presence p3 = new Presence();
        p3.setPresent(false);
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(List.of(p1, p2, p3));

        SeancePresenceStatsDTO stats = service.getSeancePresenceStats(1L);

        assertThat(stats.getSeanceId()).isEqualTo(1L);
        assertThat(stats.getTotal()).isEqualTo(3);
        assertThat(stats.getPresents()).isEqualTo(2);
        assertThat(stats.getAbsents()).isEqualTo(1);
        assertThat(stats.getTauxPresence()).isCloseTo(66.67, org.assertj.core.data.Offset.offset(0.1));
    }

    @Test
    @DisplayName("getSeancePresenceStats - liste vide renvoie zéro partout")
    void shouldReturnZerosForEmptyPresences() {
        when(presenceRepository.findBySeanceFormation_IdSeance(1L)).thenReturn(new ArrayList<>());

        SeancePresenceStatsDTO stats = service.getSeancePresenceStats(1L);

        assertThat(stats.getTotal()).isZero();
        assertThat(stats.getPresents()).isZero();
        assertThat(stats.getAbsents()).isZero();
        assertThat(stats.getTauxPresence()).isEqualTo(0.0);
    }

    // ─── getFormationWorkflowById (null seances branch) ──────────────────

    @Test
    @DisplayName("getFormationWorkflowById - seances null ne provoque pas de NPE")
    void shouldReturnDtoWhenSeancesNull() {
        Formation f = new Formation();
        f.setIdFormation(1L);
        f.setTitreFormation("No Seances");
        f.setSeances(null);
        f.setAnimateurs(null);
        f.setAnimateursExternes(null);

        when(formationRepository.findById(1L)).thenReturn(Optional.of(f));
        FormationResponseDTO mockDto = new FormationResponseDTO();
        mockDto.setTitreFormation("No Seances");
        when(formationMapper.toResponseDTO(any())).thenReturn(mockDto);

        FormationResponseDTO result = service.getFormationWorkflowById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getTitreFormation()).isEqualTo("No Seances");
    }

    // ─── mapEnseignantToDTO ───────────────────────────────────────────────

    @Test
    @DisplayName("mapEnseignantToDTO - mappe tous les champs")
    void shouldMapEnseignantToDTO() {
        Enseignant ens = new Enseignant();
        ens.setId("E1");
        ens.setNom("Dupont");
        ens.setPrenom("Jean");
        ens.setMail("dupont@test.com");
        ens.setType("INTERNE");

        EnseignantDTO dto = service.mapEnseignantToDTO(ens);

        assertThat(dto.getId()).isEqualTo("E1");
        assertThat(dto.getNom()).isEqualTo("Dupont");
        assertThat(dto.getPrenom()).isEqualTo("Jean");
        assertThat(dto.getMail()).isEqualTo("dupont@test.com");
        assertThat(dto.getType()).isEqualTo("INTERNE");
    }

    // ─── mapSeanceToDTO ───────────────────────────────────────────────────

    @Test
    @DisplayName("mapSeanceToDTO - mappe tous les champs y compris animateurs et participants")
    void shouldMapSeanceToDTO() {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setDateSeance(new Date());
        sf.setHeureDebut(Time.valueOf("09:00:00"));
        sf.setHeureFin(Time.valueOf("11:00:00"));
        sf.setSalle("B201");
        sf.setContenus("Contenu test");
        sf.setMethodes("Méthode test");
        sf.setTypeSeance(TypeSeanceEnum.THEORIQUE);
        sf.setDureeTheorique(2f);
        sf.setDureePratique(1f);

        Enseignant anim = new Enseignant();
        anim.setId("A1");
        anim.setNom("Anim");
        anim.setPrenom("Test");
        Enseignant part = new Enseignant();
        part.setId("P1");
        part.setNom("Part");
        part.setPrenom("Test");
        sf.setAnimateurs(List.of(anim));
        sf.setParticipants(List.of(part));

        SeanceDTO dto = service.mapSeanceToDTO(sf);

        assertThat(dto.getIdSeance()).isEqualTo(10L);
        assertThat(dto.getSalle()).isEqualTo("B201");
        assertThat(dto.getContenus()).isEqualTo("Contenu test");
        assertThat(dto.getMethodes()).isEqualTo("Méthode test");
        assertThat(dto.getTypeSeance()).isEqualTo(TypeSeanceEnum.THEORIQUE);
        assertThat(dto.getDureeTheorique()).isEqualTo(2f);
        assertThat(dto.getDureePratique()).isEqualTo(1f);
        assertThat(dto.getAnimateurs()).hasSize(1);
        assertThat(dto.getParticipants()).hasSize(1);
    }

    @Test
    @DisplayName("mapSeanceToDTO - null animateurs et participants")
    void shouldMapSeanceToDTOWithNullLists() {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setAnimateurs(null);
        sf.setParticipants(null);

        SeanceDTO dto = service.mapSeanceToDTO(sf);

        assertThat(dto.getIdSeance()).isEqualTo(10L);
        assertThat(dto.getAnimateurs()).isNull();
        assertThat(dto.getParticipants()).isNull();
    }

    // ─── mapPresenceToDTO ─────────────────────────────────────────────────

    @Test
    @DisplayName("mapPresenceToDTO - mappe tous les champs avec enseignant")
    void shouldMapPresenceToDTOWithEnseignant() {
        Presence p = new Presence();
        p.setIdParticipation(10L);
        p.setPresent(true);
        p.setCommentaire("Présent");
        Enseignant ens = new Enseignant();
        ens.setId("E1");
        ens.setNom("Dupont");
        ens.setPrenom("Jean");
        ens.setMail("dupont@test.com");
        p.setEnseignant(ens);

        Method m = findMethod("mapPresenceToDTO", Presence.class);
        try {
            Object result = m.invoke(service, p);
            PresenceDTO dtoResult = (PresenceDTO) result;
            assertThat(dtoResult.getIdParticipation()).isEqualTo(10L);
            assertThat(dtoResult.isPresent()).isTrue();
            assertThat(dtoResult.getCommentaire()).isEqualTo("Présent");
            assertThat(dtoResult.getEnseignant()).isNotNull();
            assertThat(dtoResult.getEnseignant().getId()).isEqualTo("E1");
        } catch (Exception e) {
            fail("Reflection failed", e);
        }
    }

    @Test
    @DisplayName("mapPresenceToDTO - enseignant null")
    void shouldMapPresenceToDTOWithNullEnseignant() {
        Presence p = new Presence();
        p.setIdParticipation(20L);
        p.setPresent(false);
        p.setEnseignant(null);

        Method m = findMethod("mapPresenceToDTO", Presence.class);
        try {
            Object result = m.invoke(service, p);
            PresenceDTO dto = (PresenceDTO) result;
            assertThat(dto.getIdParticipation()).isEqualTo(20L);
            assertThat(dto.getEnseignant()).isNull();
        } catch (Exception e) {
            fail("Reflection failed", e);
        }
    }

    // ─── createOrUpdateCalendarEvent (new event branch) ──────────────────

    @Test
    @DisplayName("createOrUpdateCalendarEvent - nouvelle seance crée un événement")
    void shouldCreateNewEventWhenNoEventId() {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setCalendarEventId(null);
        sf.setSalle("B201");

        Formation f = new Formation();
        f.setTitreFormation("Java");

        Set<String> emails = Set.of("anim@test.com", "org@esprit.tn");

        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("NEW-EVT", "https://teams.test/123"));

        Method m = findMethod("createOrUpdateCalendarEvent",
                SeanceFormation.class, String.class, String.class,
                java.time.OffsetDateTime.class, java.time.OffsetDateTime.class,
                Set.class, Formation.class);

        assertDoesNotThrow(() -> m.invoke(service, sf, "D2f-B201-Java", "<html></html>",
                java.time.OffsetDateTime.now(), java.time.OffsetDateTime.now(), emails, f));

        assertThat(sf.getCalendarEventId()).isEqualTo("NEW-EVT");
        assertThat(sf.getOnlineMeetingUrl()).isEqualTo("https://teams.test/123");
        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(any());
        verify(outlookCalendarService, never()).updateEventInCalendarWithTeamsUrl(any());
    }

    @Test
    @DisplayName("createOrUpdateCalendarEvent - seance existante met à jour l'événement")
    void shouldUpdateExistingEvent() {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setCalendarEventId("OLD-EVT");
        sf.setSalle("B201");

        Formation f = new Formation();
        f.setTitreFormation("Java");

        Set<String> emails = Set.of("anim@test.com");

        when(outlookCalendarService.updateEventInCalendarWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("OLD-EVT", "https://teams.test/456"));

        Method m = findMethod("createOrUpdateCalendarEvent",
                SeanceFormation.class, String.class, String.class,
                java.time.OffsetDateTime.class, java.time.OffsetDateTime.class,
                Set.class, Formation.class);

        assertDoesNotThrow(() -> m.invoke(service, sf, "D2f-B201-Java", "<html></html>",
                java.time.OffsetDateTime.now(), java.time.OffsetDateTime.now(), emails, f));

        verify(outlookCalendarService).updateEventInCalendarWithTeamsUrl(any());
        verify(outlookCalendarService, never()).addEventToCalendarAndReturnIdWithTeamsUrl(any());
    }

    @Test
    @DisplayName("createOrUpdateCalendarEvent - outlookCalendarService null retourne silencieusement")
    void shouldReturnSilentlyWhenCalendarServiceNull() {
        FormationWorkflowService svc = createServiceWithNullOutlook();
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);

        Method m = findMethod("createOrUpdateCalendarEvent",
                SeanceFormation.class, String.class, String.class,
                java.time.OffsetDateTime.class, java.time.OffsetDateTime.class,
                Set.class, Formation.class);

        assertDoesNotThrow(() -> m.invoke(svc, sf, "subj", "<html></html>",
                java.time.OffsetDateTime.now(), java.time.OffsetDateTime.now(),
                Set.of("a@test.com"), new Formation()));
    }

    @Test
    @DisplayName("createOrUpdateCalendarEvent - salle fallback dans la formation")
    void shouldUseFormationSalleWhenSeanceSalleBlank() {
        SeanceFormation sf = new SeanceFormation();
        sf.setIdSeance(10L);
        sf.setCalendarEventId(null);
        sf.setSalle("  ");

        Formation f = new Formation();
        f.setTitreFormation("Spring");
        f.setSalle("A100");

        when(outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(any()))
                .thenReturn(new OutlookCalendarService.EventCreationResult("EVT1", null));

        Method m = findMethod("createOrUpdateCalendarEvent",
                SeanceFormation.class, String.class, String.class,
                java.time.OffsetDateTime.class, java.time.OffsetDateTime.class,
                Set.class, Formation.class);

        assertDoesNotThrow(() -> m.invoke(service, sf, "subj", "<html></html>",
                java.time.OffsetDateTime.now(), java.time.OffsetDateTime.now(),
                Set.of("org@esprit.tn"), f));

        verify(outlookCalendarService).addEventToCalendarAndReturnIdWithTeamsUrl(argThat(params -> {
            OutlookEventParameters p = (OutlookEventParameters) params;
            return "A100".equals(p.getSalle());
        }));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private void invokeUpdateFormationBasicFields(Formation formation, FormationWorkflowRequest request) {
        Method m = findMethod("updateFormationBasicFields", Formation.class, FormationWorkflowRequest.class);
        try {
            m.invoke(service, formation, request);
        } catch (Exception e) {
            fail("Reflection failed: " + e.getMessage(), e);
        }
    }

    private Method findMethod(String name, Class<?>... params) {
        try {
            Method m = FormationWorkflowService.class.getDeclaredMethod(name, params);
            m.setAccessible(true);
            return m;
        } catch (NoSuchMethodException e) {
            fail("Method not found: " + name, e);
            return null;
        }
    }

    private FormationWorkflowService createServiceWithNullOutlook() {
        return new FormationWorkflowService(
                documentRepository, formationRepository, seanceFormationRepository,
                enseignantRepository, presenceRepository, departementRepository,
                upRepository, animateurExterneRepository, evaluationPublisher, helper,
                formationMapper, animateurParticipantResolver, emailAuditLogRepository,
                null, null);
    }
}
