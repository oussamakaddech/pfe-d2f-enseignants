package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AnimateurExterneRequest;
import esprit.pfe.serviceformation.entities.AnimateurExterne;
import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.BureauRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnimateurExterneServiceImpl implements AnimateurExterneService {

    private final AnimateurExterneRepository animateurRepository;
    private final BureauRepository bureauRepository;

    private Bureau requireBureau(Long bureauId) {
        return bureauRepository.findById(bureauId)
                .orElseThrow(() -> new IllegalArgumentException("Bureau introuvable avec l'id : " + bureauId));
    }

    private AnimateurExterne requireAnimateur(Long bureauId, Long id) {
        AnimateurExterne animateur = animateurRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Animateur externe introuvable avec l'id : " + id));
        if (animateur.getBureau() == null || !animateur.getBureau().getId().equals(bureauId)) {
            throw new IllegalArgumentException("L'animateur " + id + " n'appartient pas au bureau " + bureauId);
        }
        return animateur;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnimateurExterne> getByBureau(Long bureauId) {
        requireBureau(bureauId);
        return animateurRepository.findByBureauIdOrderByNomAscPrenomAsc(bureauId);
    }

    @Override
    @Transactional(readOnly = true)
    public AnimateurExterne getById(Long bureauId, Long id) {
        return requireAnimateur(bureauId, id);
    }

    @Override
    @Transactional
    public AnimateurExterne create(Long bureauId, AnimateurExterneRequest request) {
        Bureau bureau = requireBureau(bureauId);
        AnimateurExterne animateur = new AnimateurExterne();
        animateur.setNom(request.getNom());
        animateur.setPrenom(request.getPrenom());
        animateur.setEmail(request.getEmail());
        animateur.setBureau(bureau);
        return animateurRepository.save(animateur);
    }

    @Override
    @Transactional
    public AnimateurExterne update(Long bureauId, Long id, AnimateurExterneRequest request) {
        AnimateurExterne animateur = requireAnimateur(bureauId, id);
        animateur.setNom(request.getNom());
        animateur.setPrenom(request.getPrenom());
        animateur.setEmail(request.getEmail());
        return animateurRepository.save(animateur);
    }

    @Override
    @Transactional
    public void delete(Long bureauId, Long id) {
        AnimateurExterne animateur = requireAnimateur(bureauId, id);
        animateurRepository.delete(animateur);
    }
}
