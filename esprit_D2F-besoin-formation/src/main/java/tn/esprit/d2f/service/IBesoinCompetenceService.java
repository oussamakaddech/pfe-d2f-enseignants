package tn.esprit.d2f.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.d2f.dto.BesoinCompetenceDTO;

import java.util.List;

public interface IBesoinCompetenceService {
    List<BesoinCompetenceDTO> getByBesoin(Long besoinId);
    Page<BesoinCompetenceDTO> getByBesoin(Long besoinId, Pageable pageable);
    List<BesoinCompetenceDTO> replaceAll(Long besoinId, List<BesoinCompetenceDTO> links);
}
