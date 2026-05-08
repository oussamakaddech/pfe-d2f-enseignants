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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificateListenerServiceExtendedTest {

    @Mock
    private CertificateRepository certificateRepository;
    @Mock
    private Resource backgroundImageResource;
    @InjectMocks
    private CertificateListenerService service;

    @Test
    void onMessage_nullEnseignants_shouldNotSave() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setEnseignants(null);
        service.onCertificateBatchMessage(msg);
        verify(certificateRepository, never()).save(any());
    }

    @Test
    void onMessage_emptyEnseignants_shouldNotSave() {
        CertificateBatchMessage msg = new CertificateBatchMessage();
        msg.setFormationId(1L);
        msg.setEnseignants(List.of());
        service.onCertificateBatchMessage(msg);
        verify(certificateRepository, never()).save(any());
    }
}
