package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.SeanceFormation;
import esprit.pfe.serviceformation.messaging.CertificateEventPublisher;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FormationClosureServiceTest {

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private SeanceFormationRepository seanceFormationRepository;

    @Mock
    private PresenceRepository presenceRepository;

    @Mock
    private CertificateEventPublisher certificateEventPublisher;

    @InjectMocks
    private FormationClosureService formationClosureService;

    private Formation testFormation;

    @BeforeEach
    void setUp() {
        testFormation = new Formation();
        testFormation.setIdFormation(1L);
        testFormation.setTitreFormation("Java Training");
        testFormation.setCertifGenerated(false);
    }

    @Test
    void generateCertificates_WithValidFormation_ShouldGenerateCertificates() {
        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(Collections.emptyList());
        when(presenceRepository.findEnseignantsPresentSurToutesLesSeances(1L)).thenReturn(Collections.emptyList());

        formationClosureService.generateCertificates(1L, "PARTICIPATION");

        verify(certificateEventPublisher).sendCertificateBatchMessage(any());
        verify(formationRepository).save(any(Formation.class));

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(formationRepository).save(captor.capture());
        assertTrue(captor.getValue().isCertifGenerated());
    }

    @Test
    void generateCertificates_WithAlreadyGenerated_ShouldThrowException() {
        testFormation.setCertifGenerated(true);
        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));

        assertThrows(IllegalStateException.class, () -> 
            formationClosureService.generateCertificates(1L, "PARTICIPATION"));
    }

    @Test
    void generateCertificates_WithNonExistentFormation_ShouldThrowException() {
        when(formationRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> 
            formationClosureService.generateCertificates(1L, "PARTICIPATION"));
    }

    @Test
    void generateCertificates_WithSeances_ShouldIncludeAnimateursAndParticipants() {
        Enseignant anim = new Enseignant();
        anim.setId("E001");
        anim.setNom("Anim");
        anim.setPrenom("Test");

        Enseignant part = new Enseignant();
        part.setId("E002");
        part.setNom("Part");
        part.setPrenom("Test");

        SeanceFormation seance = new SeanceFormation();
        seance.setAnimateurs(List.of(anim));
        seance.setParticipants(List.of(part));

        Enseignant presentEnseignant = new Enseignant();
        presentEnseignant.setId("E002");
        presentEnseignant.setNom("Part");
        presentEnseignant.setPrenom("Test");
        presentEnseignant.setMail("part@test.com");

        when(formationRepository.findById(1L)).thenReturn(Optional.of(testFormation));
        when(seanceFormationRepository.findByFormationId(1L)).thenReturn(List.of(seance));
        when(presenceRepository.findEnseignantsPresentSurToutesLesSeances(1L)).thenReturn(List.of(presentEnseignant));

        formationClosureService.generateCertificates(1L, "PARTICIPATION");

        verify(certificateEventPublisher).sendCertificateBatchMessage(any());
    }
}
