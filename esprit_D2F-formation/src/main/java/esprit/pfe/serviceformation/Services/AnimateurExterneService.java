package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AnimateurExterneRequest;
import esprit.pfe.serviceformation.entities.AnimateurExterne;

import java.util.List;

public interface AnimateurExterneService {
    List<AnimateurExterne> getByBureau(Long bureauId);
    AnimateurExterne getById(Long bureauId, Long id);
    AnimateurExterne create(Long bureauId, AnimateurExterneRequest request);
    AnimateurExterne update(Long bureauId, Long id, AnimateurExterneRequest request);
    void delete(Long bureauId, Long id);
}
