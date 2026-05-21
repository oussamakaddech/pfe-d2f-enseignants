package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Bureau;

import java.util.List;

public interface BureauService {
    List<Bureau> getAllBureaux();
    Bureau getBureauById(Long id);
    Bureau createBureau(Bureau bureau);
    Bureau updateBureau(Long id, Bureau bureau);
    void deleteBureau(Long id);
}
