package esprit.pfe.servicecertificat.services;

import esprit.pfe.servicecertificat.dto.CertificateIndicatorDTO;
import esprit.pfe.servicecertificat.dto.CertificateRequest;
import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.dto.CertificateVerificationResponse;
import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.exception.ResourceNotFoundException;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CertificateServiceImpl implements CertificateService {

    private static final String REVOKED = "REVOKED";

    private final CertificateRepository certificateRepository;

    @Override
    @Transactional
    public CertificateResponse create(CertificateRequest request) {
        Certificate certificate = mapToEntity(request);
        initializeVerificationFields(certificate);
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
        return findByFormationInternal(formationId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CertificateResponse> findByFormation(Long formationId, Pageable pageable) {
        return paginate(findByFormationInternal(formationId), pageable);
    }

    @Override
    @Transactional
    public CertificateResponse deliver(Long id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable : " + id));
        if (REVOKED.equals(cert.getCertificateStatus())) {
            throw new IllegalStateException("Un certificat révoqué ne peut pas être délivré : " + id);
        }
        cert.setDelivered(true);
        return mapToResponse(certificateRepository.save(cert));
    }

    @Override
    @Transactional
    public CertificateResponse revoke(Long id, String reason, String revokedBy) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Le motif de révocation est obligatoire.");
        }
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable : " + id));
        if (REVOKED.equals(cert.getCertificateStatus())) {
            throw new IllegalStateException("Certificat déjà révoqué : " + id);
        }
        cert.setCertificateStatus(REVOKED);
        cert.setDelivered(false);
        cert.setRevokedAt(OffsetDateTime.now(ZoneOffset.UTC));
        cert.setRevokedBy(revokedBy);
        cert.setRevocationReason(reason);
        return mapToResponse(certificateRepository.save(cert));
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateIndicatorDTO getIndicators() {
        return CertificateIndicatorDTO.builder()
                .eligibleCount(certificateRepository.count())
                .deliveredCount(certificateRepository.countByDeliveredTrue())
                .pendingCount(certificateRepository.countByDeliveredFalse())
                .revokedCount(certificateRepository.countByCertificateStatus(REVOKED))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateIndicatorDTO getIndicatorsByFormation(Long formationId) {
        return CertificateIndicatorDTO.builder()
                .eligibleCount(certificateRepository.countByFormationId(formationId))
                .deliveredCount(certificateRepository.countByFormationIdAndDeliveredTrue(formationId))
                .pendingCount(certificateRepository.countByFormationIdAndDeliveredFalse(formationId))
                .revokedCount(certificateRepository.countByFormationIdAndCertificateStatus(formationId, REVOKED))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> findByEmail(String email) {
        return findByEmailInternal(email);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CertificateResponse> findByEmail(String email, Pageable pageable) {
        return paginate(findByEmailInternal(email), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> findByEnseignant(String enseignantId) {
        return findByEnseignantInternal(enseignantId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CertificateResponse> findByEnseignant(String enseignantId, Pageable pageable) {
        return paginate(findByEnseignantInternal(enseignantId), pageable);
    }

    @Override
    @Transactional
    public CertificateResponse update(Long id, CertificateRequest request) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable : " + id));
        updateEntityFromRequest(cert, request);
        return mapToResponse(certificateRepository.save(cert));
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateVerificationResponse verify(String certificateNumber) {
        return certificateRepository.findByCertificateNumberAndCertificateStatus(certificateNumber, "ISSUED")
                .map(this::mapToVerificationResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat invalide ou révoqué"));
    }

    private CertificateVerificationResponse mapToVerificationResponse(Certificate entity) {
        CertificateVerificationResponse response = new CertificateVerificationResponse();
        response.setCertificateNumber(entity.getCertificateNumber());
        response.setNomEnseignant(entity.getNomEnseignant());
        response.setPrenomEnseignant(entity.getPrenomEnseignant());
        response.setTitreFormation(entity.getTitreFormation());
        response.setChargeHoraireGlobal(entity.getChargeHoraireGlobal());
        response.setDateDebutFormation(entity.getDateDebutFormation());
        response.setDateFinFormation(entity.getDateFinFormation());
        response.setIssuedAt(entity.getIssuedAt());
        response.setCertificateStatus(entity.getCertificateStatus());
        response.setCompetencesValidees(entity.getCompetencesValidees());
        return response;
    }

    // ── Mapping ──────────────────────────────────────────────────────────────

    private CertificateResponse mapToResponse(Certificate entity) {
        CertificateResponse res = new CertificateResponse();
        res.setId(entity.getIdCertificate());
        res.setCertificateNumber(entity.getCertificateNumber());
        res.setVerificationToken(entity.getVerificationToken());
        res.setVerificationHash(entity.getVerificationHash());
        res.setIssuedAt(entity.getIssuedAt());
        res.setCertificateStatus(entity.getCertificateStatus());
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
        res.setPdfFilePath(entity.getPdfFilePath());
        res.setRevokedAt(entity.getRevokedAt());
        res.setRevokedBy(entity.getRevokedBy());
        res.setRevocationReason(entity.getRevocationReason());
        return res;
    }

    private List<CertificateResponse> findByFormationInternal(Long formationId) {
        return certificateRepository.findByFormationId(formationId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private List<CertificateResponse> findByEmailInternal(String email) {
        return certificateRepository.findByMailEnseignant(email).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private List<CertificateResponse> findByEnseignantInternal(String enseignantId) {
        return certificateRepository.findByEnseignantId(enseignantId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private Certificate mapToEntity(CertificateRequest req) {
        Certificate cert = new Certificate();
        updateEntityFromRequest(cert, req);
        return cert;
    }

    private void initializeVerificationFields(Certificate certificate) {
        String token = UUID.randomUUID().toString();
        certificate.setVerificationToken(token);
        certificate.setVerificationHash(sha256(token + ":" + certificate.getFormationId()
                + ":" + certificate.getEnseignantId()));
        certificate.setIssuedAt(OffsetDateTime.now(ZoneOffset.UTC));
        certificate.setCertificateStatus("ISSUED");
        certificate.setCertificateNumber("CERT-%d-%06d".formatted(
                certificate.getIssuedAt().getYear(),
                // floorMod : Math.abs(Integer.MIN_VALUE) reste negatif (RV_ABSOLUTE_VALUE_OF_HASHCODE)
                Math.floorMod(token.hashCode(), 1_000_000)));
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
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

    private Page<CertificateResponse> paginate(List<CertificateResponse> items, Pageable pageable) {
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), items.size());
        return new PageImpl<>(from >= items.size() ? List.of() : items.subList(from, to), pageable, items.size());
    }
}