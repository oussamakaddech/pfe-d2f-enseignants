package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CertificateService {

    CertificateResponse create(CertificateRequest request);

    Page<CertificateResponse> findAll(Pageable pageable);

    List<CertificateResponse> findByFormation(Long formationId);

    CertificateResponse deliver(Long id);

    List<CertificateResponse> findByEmail(String email);

    List<CertificateResponse> findByEnseignant(String enseignantId);

    CertificateResponse update(Long id, CertificateRequest request);
}
