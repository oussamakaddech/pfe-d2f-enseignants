package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Bureau;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface BureauService {
    Page<Bureau> getAllBureaux(Pageable pageable);
    List<Bureau> getAllBureaux();
    Bureau getBureauById(Long id);
    Bureau createBureau(Bureau bureau);
    Bureau updateBureau(Long id, Bureau bureau);
    void deleteBureau(Long id);
}
