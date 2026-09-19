package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EvaluationGlobaleService {

    private static final String MSG_NOT_FOUND = "Évaluation globale non trouvée avec l'id : ";
    private static final String ROLE_RESPONSABLE_DOSSIER = "ROLE_RESPONSABLE_DOSSIER";
    private static final String ROLE_CUP = "ROLE_CUP";
    private static final String ROLE_CHEF_DEPARTEMENT = "ROLE_CHEF_DEPARTEMENT";

    private final EvaluationGlobaleRepository evaluationGlobaleRepository;
    private final esprit.pfe.serviceevaluation.client.FormationClient formationClient;

    /**
     * Vérifie que l'utilisateur connecté a le droit de créer/modifier une évaluation globale.
     * Règle : ADMIN, CUP et CHEF_DEPARTEMENT évaluent toute formation (pilotage) ;
     * les autres rôles (sauf RESPONSABLE_DOSSIER, exclu) doivent participer à la
     * formation (inscrit approuvé, animateur ou formateur).
     */
    private void verifierAutorisationEvaluationGlobale(String evaluatorIdentity, String userRole, Long formationId) {
        if (userRole != null && userRole.contains(ROLE_RESPONSABLE_DOSSIER)) {
            throw new SecurityException("Le responsable dossier ne peut pas évaluer les formations.");
        }
        if (userRole != null && (userRole.contains("ROLE_ADMIN")
                || userRole.contains(ROLE_CUP)
                || userRole.contains(ROLE_CHEF_DEPARTEMENT))) {
            return;
        }
        Boolean isParticipant = formationClient.isParticipantOfFormation(formationId, evaluatorIdentity);
        if (!Boolean.TRUE.equals(isParticipant)) {
            throw new SecurityException("Vous devez participer à cette formation pour l'évaluer (inscrit, animateur ou formateur).");
        }
    }

    private EvaluationGlobaleDTO mapToDto(EvaluationGlobale entity) {
        EvaluationGlobaleDTO dto = new EvaluationGlobaleDTO();
        dto.setIdEvalGlobale(entity.getIdEvalGlobale());
        dto.setFormationId(entity.getFormationId());
        dto.setEnseignantId(entity.getEnseignantId());
        dto.setCommentaireGeneral(entity.getCommentaireGeneral());
        dto.setDateEvaluation(entity.getDateEvaluation());
        dto.setNoteGlobale(entity.getNoteGlobale());
        dto.setRecommandation(entity.getRecommandation());
        dto.setPertinenceContenu(entity.getPertinenceContenu());
        dto.setOrganisation(entity.getOrganisation());
        dto.setQualiteSupports(entity.getQualiteSupports());
        dto.setDureeAdaptee(entity.getDureeAdaptee());
        dto.setSatisfactionGlobale(entity.getSatisfactionGlobale());
        return dto;
    }

    private EvaluationGlobale mapToEntity(EvaluationGlobaleDTO dto) {
        EvaluationGlobale entity = new EvaluationGlobale();
        entity.setIdEvalGlobale(dto.getIdEvalGlobale());
        entity.setFormationId(dto.getFormationId());
        entity.setEnseignantId(dto.getEnseignantId());
        entity.setCommentaireGeneral(dto.getCommentaireGeneral());
        entity.setDateEvaluation(dto.getDateEvaluation());
        entity.setNoteGlobale(dto.getNoteGlobale());
        entity.setRecommandation(dto.getRecommandation());
        applyCriteria(entity, dto);
        return entity;
    }

    /** Applique les critères structurés de l'évaluation de la formation. */
    private void applyCriteria(EvaluationGlobale entity, EvaluationGlobaleDTO dto) {
        entity.setPertinenceContenu(dto.getPertinenceContenu());
        entity.setOrganisation(dto.getOrganisation());
        entity.setQualiteSupports(dto.getQualiteSupports());
        entity.setDureeAdaptee(dto.getDureeAdaptee());
        entity.setSatisfactionGlobale(dto.getSatisfactionGlobale());
    }

    public EvaluationGlobaleDTO createEvaluationGlobale(EvaluationGlobaleDTO dto, String evaluatorIdentity, String userRole) {
        verifierAutorisationEvaluationGlobale(evaluatorIdentity, userRole, dto.getFormationId());
        if (evaluationGlobaleRepository.existsByFormationId(dto.getFormationId())) {
            throw new IllegalStateException("Une évaluation globale existe déjà pour la formation " + dto.getFormationId());
        }
        EvaluationGlobale entity = mapToEntity(dto);
        return mapToDto(evaluationGlobaleRepository.save(entity));
    }

    public EvaluationGlobaleDTO updateEvaluationGlobale(Long id, EvaluationGlobaleDTO dto, String evaluatorIdentity, String userRole) {
        verifierAutorisationEvaluationGlobale(evaluatorIdentity, userRole, dto.getFormationId());
        EvaluationGlobale existing = evaluationGlobaleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(MSG_NOT_FOUND + id));
        existing.setCommentaireGeneral(dto.getCommentaireGeneral());
        existing.setEnseignantId(dto.getEnseignantId());
        existing.setDateEvaluation(dto.getDateEvaluation());
        existing.setNoteGlobale(dto.getNoteGlobale());
        existing.setRecommandation(dto.getRecommandation());
        applyCriteria(existing, dto);
        return mapToDto(evaluationGlobaleRepository.save(existing));
    }

    public void deleteEvaluationGlobale(Long id) {
        EvaluationGlobale entity = evaluationGlobaleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(MSG_NOT_FOUND + id));
        evaluationGlobaleRepository.delete(entity);
    }

    public EvaluationGlobaleDTO getEvaluationGlobaleById(Long id) {
        return evaluationGlobaleRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new EntityNotFoundException(MSG_NOT_FOUND + id));
    }

    public EvaluationGlobaleDTO getEvaluationGlobaleByFormationId(Long formationId) {
        return evaluationGlobaleRepository.findByFormationId(formationId)
                .map(this::mapToDto)
                .orElseThrow(() -> new EntityNotFoundException("Évaluation globale non trouvée pour la formation : " + formationId));
    }

    public Page<EvaluationGlobaleDTO> getAllEvaluationGlobales(Pageable pageable) {
        ListScope scope = resolveListScope();
        if (scope.global()) {
            return evaluationGlobaleRepository.findAll(pageable)
                    .map(this::mapToDto);
        }
        if (scope.ficheId() == null) {
            return Page.empty(pageable);
        }
        return evaluationGlobaleRepository.findByEnseignantId(scope.ficheId(), pageable)
                .map(this::mapToDto);
    }

    /** Périmètre de lecture : global (ADMIN/ANIMATEUR) ou évaluations personnelles. */
    private record ListScope(boolean global, String ficheId) {
    }

    private ListScope resolveListScope() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return new ListScope(false, null);
        }
        boolean global = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_ANIMATEUR".equals(a.getAuthority()));
        if (global) {
            return new ListScope(true, null);
        }
        return new ListScope(false, resolveFicheId(callerIdentity(auth)));
    }

    private String callerIdentity(org.springframework.security.core.Authentication auth) {
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) {
                return email;
            }
        }
        return auth.getName();
    }

    /** Résout l'id de fiche via le service formation (accepte id ou mail). */
    private String resolveFicheId(String identity) {
        if (identity == null || identity.isBlank()) {
            return null;
        }
        try {
            Object found = formationClient.getEnseignantById(identity);
            if (found instanceof java.util.Map<?, ?> map) {
                Object id = map.get("id");
                return id != null ? String.valueOf(id) : null;
            }
            if (found instanceof String s && !s.isBlank()) {
                return s;
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
