package esprit.pfe.servicecertificat.Services;

import esprit.pfe.servicecertificat.DTO.CertificateBatchMessage;
import esprit.pfe.servicecertificat.Entities.Certificate;
import esprit.pfe.servicecertificat.Repositories.CertificateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificateListenerServiceTest {

    @Mock
    private CertificateRepository repository;
    @Mock
    private Resource backgroundImageResource;
    @InjectMocks
    private CertificateListenerService service;

    @Test
    void onMessage_nullEnseignants_shouldReturnEarly() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setTitreFormation("Test");
        msg.setEnseignants(null);

        service.onCertificateBatchMessage(msg);

        verify(repository, never()).save(any());
    }

    @Test
    void onMessage_emptyEnseignants_shouldReturnEarly() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setTitreFormation("Test");
        msg.setEnseignants(Collections.emptyList());

        service.onCertificateBatchMessage(msg);

        verify(repository, never()).save(any());
    }

    @Test
    void onMessage_withEnseignants_shouldSaveCertificates() throws Exception {
        CertificateBatchMessage.EnseignantPresenceInfo info = new CertificateBatchMessage.EnseignantPresenceInfo();
        info.setEnseignantId("ens-1");
        info.setNom("Test");
        info.setPrenom("User");
        info.setMail("test@esprit.tn");
        info.setDeptEnseignantLibelle("INFO");
        info.setRole("Participant");
        info.setPresent(true);

        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(10L);
        msg.setTitreFormation("Java");
        msg.setTypeCertif("Participation");
        msg.setDateDebutFormation(LocalDate.of(2026, 1, 1));
        msg.setDateFinFormation(LocalDate.of(2026, 1, 5));
        msg.setChargeHoraireGlobal(20);
        msg.setEnseignants(List.of(info));

        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        try {
            service.onCertificateBatchMessage(msg);
        } catch (RuntimeException e) {
            // Expected: PDF generation fails because backgroundImageResource is mocked
        }

        verify(repository).save(any(Certificate.class));
    }
}
