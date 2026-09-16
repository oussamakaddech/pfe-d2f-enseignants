package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.repositories.BureauRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BureauServiceImpl implements BureauService {

    private final BureauRepository bureauRepository;

    @Override
    public Page<Bureau> getAllBureaux(Pageable pageable) {
        return bureauRepository.findAll(pageable);
    }

    @Override
    public List<Bureau> getAllBureaux() {
        return bureauRepository.findAll();
    }

    @Override
    public Bureau getBureauById(Long id) {
        return bureauRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bureau introuvable avec l'id : " + id));
    }

    @Override
    @Transactional
    public Bureau createBureau(Bureau bureau) {
        return bureauRepository.save(bureau);
    }

    @Override
    @Transactional
    public Bureau updateBureau(Long id, Bureau bureau) {
        Bureau existing = getBureauById(id);
        existing.setNom(bureau.getNom());
        existing.setEmail(bureau.getEmail());
        existing.setNumeroTelephone(bureau.getNumeroTelephone());
        return bureauRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteBureau(Long id) {
        if (!bureauRepository.existsById(id)) {
            throw new IllegalArgumentException("Bureau introuvable avec l'id : " + id);
        }
        bureauRepository.deleteById(id);
    }
}
