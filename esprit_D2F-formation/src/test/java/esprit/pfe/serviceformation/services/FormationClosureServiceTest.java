package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.CertificateEligibilitySummaryDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.messaging.CertificateEventPublisher;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FormationClosureServiceTest {

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private SeanceFormationRepository seanceFormationRepository;

    @Mock
    private EnseignantRepository enseignantRepository;

    @Mock
    private CertificateEventPublisher certificateEventPublisher;

    @Mock
    private CertificateEligibilityService certificateEligibilityService;

    @InjectMocks
    private FormationClosureService formationClosureService;

    private Formation testFormation;
    private CertificateEligibilitySummaryDTO eligibleSummary;
    private CertificateEligibilitySummaryDTO ineligibleSummary;

    @BeforeEach
    void setUp() {
        testFormation = new Formation();
        testFormation.setIdFormation(1L);
        testFormation.setTitreFormation("Java Training");
        testFormation.setEtatFormation(EtatFormation.ACHEVE);
        testFormation.setCertifGenerated(false);

        eligibleSummary = CertificateEligibilitySummaryDTO.builder()
                .trainingId(1L)
                .participantId("E002")
                .eligible(true)
                .rejectionReasons(List.of())
                .warnings(List.of())
                .riskLevel("LOW")
                .attendanceOk(true)
                .postTestOk(true)
                .evaluationSubmitted(true)
                .build();

        ineligibleSummary = CertificateEligibilitySummaryDTO.builder()
                .trainingId(1L)
                .participantId("E002")
                .eligible(false)
                .rejectionReasons(List.of("Taux de présence insuffisant"))
                .warnings(List.of())
                .riskLevel("HIGH")
                .attendanceOk(false)
                .postTestOk(true)
                .evaluationSubmitted(true)
                .build();
    }

    private CertificateEligibilitySummaryDTO eligible(String participantId) {
        return CertificateEligibilitySummaryDTO.builder()
                .trainingId(1L)
                .participantId(participantId)
                .eligible(true)
                .rejectionReasons(List.of())
                .warnings(List.of())
                .riskLevel("LOW")
                .attendanceOk(true)
                .postTestOk(true)
                .evaluationSubmitted(true)
                .build();
    }

    @Test
    void generateCertificates_WithoutSessions_ShouldRejectGeneration() {
        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(Collections.emptyList());

        assertThrows(IllegalStateException.class,
            () -> formationClosureService.generateCertificates(1L, "ATTESTATION"));

        verifyNoInteractions(certificateEligibilityService, certificateEventPublisher);
        verify(formationRepository, never()).save(any(Formation.class));
    }

    @Test
    void generateCertificates_WithAlreadyGenerated_ShouldThrowException() {
        testFormation.setCertifGenerated(true);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));

        assertThrows(IllegalStateException.class, () -> 
            formationClosureService.generateCertificates(1L, "ATTESTATION"));
    }

    @Test
    void generateCertificates_WhenFormationIsNotCompleted_ShouldNotPublishEvent() {
        testFormation.setEtatFormation(EtatFormation.EN_COURS);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));

        assertThrows(IllegalStateException.class,
                () -> formationClosureService.generateCertificates(1L, "ATTESTATION"));

        verifyNoInteractions(seanceFormationRepository, certificateEligibilityService, certificateEventPublisher);
        verify(formationRepository, never()).save(any(Formation.class));
    }

    @Test
    void generateCertificates_WithNonExistentFormation_ShouldThrowException() {
        when(formationRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> 
            formationClosureService.generateCertificates(1L, "ATTESTATION"));
    }

    @Test
    void generateCertificates_WithSeances_ShouldIncludeEligibleAnimateursAndParticipants() {
        Enseignant anim = new Enseignant();
        anim.setId("E001");
        anim.setNom("Anim");
        anim.setPrenom("Test");
        anim.setMail("anim@test.com");

        Enseignant part = new Enseignant();
        part.setId("E002");
        part.setNom("Part");
        part.setPrenom("Test");
        part.setMail("part@test.com");

        SeanceFormation seance = new SeanceFormation();
        seance.setAnimateurs(List.of(anim));
        seance.setParticipants(List.of(part));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(seance));
        when(enseignantRepository.findById("E001")).thenReturn(Optional.of(anim));
        when(enseignantRepository.findById("E002")).thenReturn(Optional.of(part));
        when(certificateEligibilityService.evaluateEligibilityWithSummary(eq(1L), eq("E001"), anyString()))
                .thenReturn(eligible("E001"));
        when(certificateEligibilityService.evaluateEligibilityWithSummary(eq(1L), eq("E002"), anyString()))
                .thenReturn(eligible("E002"));

        formationClosureService.generateCertificates(1L, "ATTESTATION");

        ArgumentCaptor<esprit.pfe.serviceformation.messaging.CertificateBatchMessage> captor =
                ArgumentCaptor.forClass(esprit.pfe.serviceformation.messaging.CertificateBatchMessage.class);
        verify(certificateEventPublisher).sendCertificateBatchMessage(captor.capture());
        assertNotNull(captor.getValue());
        verify(formationRepository).save(testFormation);
    }

    @Test
    void generateCertificates_WhenParticipantIsNotEligible_ShouldExcludeFromBatch() {
        Enseignant anim = new Enseignant();
        anim.setId("E001");
        anim.setNom("Anim");
        anim.setPrenom("Test");
        anim.setMail("anim@test.com");

        Enseignant part = new Enseignant();
        part.setId("E002");
        part.setNom("Part");
        part.setPrenom("Test");
        part.setMail("part@test.com");

        SeanceFormation seance = new SeanceFormation();
        seance.setAnimateurs(List.of(anim));
        seance.setParticipants(List.of(part));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(seance));
        when(enseignantRepository.findById("E001")).thenReturn(Optional.of(anim));
        when(enseignantRepository.findById("E002")).thenReturn(Optional.of(part));
        when(certificateEligibilityService.evaluateEligibilityWithSummary(eq(1L), eq("E001"), anyString()))
                .thenReturn(eligible("E001"));
        when(certificateEligibilityService.evaluateEligibilityWithSummary(eq(1L), eq("E002"), anyString()))
                .thenReturn(ineligibleSummary);

        formationClosureService.generateCertificates(1L, "ATTESTATION");

        ArgumentCaptor<esprit.pfe.serviceformation.messaging.CertificateBatchMessage> captor =
                ArgumentCaptor.forClass(esprit.pfe.serviceformation.messaging.CertificateBatchMessage.class);
        verify(certificateEventPublisher).sendCertificateBatchMessage(captor.capture());
        // Seul l'animateur éligible reçoit un certificat
        assertEquals(1, captor.getValue().getEnseignants().size());
        assertEquals("E001", captor.getValue().getEnseignants().get(0).getEnseignantId());
    }

    @Test
    void generateCertificates_WhenNoParticipantIsEligible_ShouldRejectGeneration() {
        Enseignant part = new Enseignant();
        part.setId("E002");
        part.setNom("Part");
        part.setPrenom("Test");
        part.setMail("part@test.com");

        SeanceFormation seance = new SeanceFormation();
        seance.setParticipants(List.of(part));

        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(seance));
        when(enseignantRepository.findById("E002")).thenReturn(Optional.of(part));
        when(certificateEligibilityService.evaluateEligibilityWithSummary(eq(1L), eq("E002"), anyString()))
                .thenReturn(ineligibleSummary);

        assertThrows(IllegalStateException.class,
                () -> formationClosureService.generateCertificates(1L, "ATTESTATION"));

        verifyNoInteractions(certificateEventPublisher);
        verify(formationRepository, never()).save(any(Formation.class));
    }
}
