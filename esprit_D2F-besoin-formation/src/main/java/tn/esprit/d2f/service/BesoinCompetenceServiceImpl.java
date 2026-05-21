package tn.esprit.d2f.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.dto.BesoinCompetenceDTO;
import tn.esprit.d2f.entity.BesoinCompetence;
import tn.esprit.d2f.repository.BesoinCompetenceRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BesoinCompetenceServiceImpl implements IBesoinCompetenceService {

    private final BesoinCompetenceRepository repository;

    @Override
    public List<BesoinCompetenceDTO> getByBesoin(Long besoinId) {
        return repository.findByBesoinId(besoinId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public List<BesoinCompetenceDTO> replaceAll(Long besoinId, List<BesoinCompetenceDTO> links) {
        repository.deleteByBesoinId(besoinId);
        List<BesoinCompetence> entities = links.stream()
                .filter(l -> l.getCompetenceId() != null)
                .map(l -> BesoinCompetence.builder()
                        .besoinId(besoinId)
                        .domaineId(l.getDomaineId())
                        .competenceId(l.getCompetenceId())
                        .competenceNom(l.getCompetenceNom())
                        .savoirId(l.getSavoirId())
                        .savoirNom(l.getSavoirNom())
                        .sousCompetenceId(l.getSousCompetenceId())
                        .build())
                .toList();
        return repository.saveAll(entities).stream()
                .map(this::toDTO)
                .toList();
    }

    private BesoinCompetenceDTO toDTO(BesoinCompetence e) {
        return BesoinCompetenceDTO.builder()
                .id(e.getId())
                .besoinId(e.getBesoinId())
                .domaineId(e.getDomaineId())
                .competenceId(e.getCompetenceId())
                .competenceNom(e.getCompetenceNom())
                .savoirId(e.getSavoirId())
                .savoirNom(e.getSavoirNom())
                .sousCompetenceId(e.getSousCompetenceId())
                .build();
    }
}
