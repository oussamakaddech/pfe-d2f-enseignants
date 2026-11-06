package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateIndicatorDTO;
import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.dto.CertificateVerificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CertificateService {

    CertificateResponse create(CertificateRequest request);

    Page<CertificateResponse> findAll(Pageable pageable);

    List<CertificateResponse> findByFormation(Long formationId);
    Page<CertificateResponse> findByFormation(Long formationId, Pageable pageable);

    CertificateResponse deliver(Long id);

    CertificateResponse revoke(Long id, String reason, String revokedBy);

    CertificateIndicatorDTO getIndicators();

    CertificateIndicatorDTO getIndicatorsByFormation(Long formationId);

    List<CertificateResponse> findByEmail(String email);
    Page<CertificateResponse> findByEmail(String email, Pageable pageable);

    List<CertificateResponse> findByEnseignant(String enseignantId);
    Page<CertificateResponse> findByEnseignant(String enseignantId, Pageable pageable);

    CertificateResponse update(Long id, CertificateRequest request);
    CertificateVerificationResponse verify(String certificateNumber);
}
