package tn.esprit.d2f.service;

import tn.esprit.d2f.dto.BesoinCompetenceDTO;

import java.util.List;

public interface IBesoinCompetenceService {
    List<BesoinCompetenceDTO> getByBesoin(Long besoinId);
    List<BesoinCompetenceDTO> replaceAll(Long besoinId, List<BesoinCompetenceDTO> links);
}
