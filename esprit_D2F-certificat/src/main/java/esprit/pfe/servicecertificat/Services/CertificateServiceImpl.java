package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.exception.ResourceNotFoundException;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CertificateServiceImpl implements CertificateService {

    private final CertificateRepository certificateRepository;

    @Override
    @Transactional
    public CertificateResponse create(CertificateRequest request) {
        Certificate certificate = mapToEntity(request);
        certificate.setDelivered(false);
        return mapToResponse(certificateRepository.save(certificate));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CertificateResponse> findAll(Pageable pageable) {
        return certificateRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> findByFormation(Long formationId) {
        return certificateRepository.findByFormationId(formationId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public CertificateResponse deliver(Long id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable : " + id));
        cert.setDelivered(true);
        return mapToResponse(certificateRepository.save(cert));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> findByEmail(String email) {
        return certificateRepository.findByMailEnseignant(email).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> findByEnseignant(String enseignantId) {
        return certificateRepository.findByEnseignantId(enseignantId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public CertificateResponse update(Long id, CertificateRequest request) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable : " + id));
        updateEntityFromRequest(cert, request);
        return mapToResponse(certificateRepository.save(cert));
    }

    // ── Mapping ──────────────────────────────────────────────────────────────

    private CertificateResponse mapToResponse(Certificate entity) {
        CertificateResponse res = new CertificateResponse();
        res.setId(entity.getIdCertificate());
        res.setFormationId(entity.getFormationId());
        res.setTitreFormation(entity.getTitreFormation());
        res.setTypeCertif(entity.getTypeCertif());
        res.setDateDebutFormation(entity.getDateDebutFormation());
        res.setDateFinFormation(entity.getDateFinFormation());
        res.setChargeHoraireGlobal(entity.getChargeHoraireGlobal());
        res.setEnseignantId(entity.getEnseignantId());
        res.setNomEnseignant(entity.getNomEnseignant());
        res.setPrenomEnseignant(entity.getPrenomEnseignant());
        res.setMailEnseignant(entity.getMailEnseignant());
        res.setDeptEnseignant(entity.getDeptEnseignant());
        res.setRoleEnFormation(entity.getRoleEnFormation());
        res.setDelivered(entity.isDelivered());
        res.setCreatedAt(entity.getDateFinFormation());
        return res;
    }

    private Certificate mapToEntity(CertificateRequest req) {
        Certificate cert = new Certificate();
        updateEntityFromRequest(cert, req);
        return cert;
    }

    private void updateEntityFromRequest(Certificate cert, CertificateRequest req) {
        cert.setFormationId(req.getFormationId());
        cert.setTitreFormation(req.getTitreFormation());
        cert.setTypeCertif(req.getTypeCertif());
        cert.setDateDebutFormation(req.getDateDebutFormation());
        cert.setDateFinFormation(req.getDateFinFormation());
        cert.setChargeHoraireGlobal(req.getChargeHoraireGlobal());
        cert.setEnseignantId(req.getEnseignantId());
        cert.setNomEnseignant(req.getNomEnseignant());
        cert.setPrenomEnseignant(req.getPrenomEnseignant());
        cert.setMailEnseignant(req.getMailEnseignant());
        cert.setDeptEnseignant(req.getDeptEnseignant());
        cert.setRoleEnFormation(req.getRoleEnFormation());
    }
}
