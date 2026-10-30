package tn.esprit.d2f.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.dto.BesoinCompetenceDTO;
import tn.esprit.d2f.entity.BesoinCompetence;
import tn.esprit.d2f.repository.BesoinCompetenceRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    public Page<BesoinCompetenceDTO> getByBesoin(Long besoinId, Pageable pageable) {
        List<BesoinCompetenceDTO> all = getByBesoin(besoinId);
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size());
    }

    @Override
    @Transactional
    public List<BesoinCompetenceDTO> replaceAll(Long besoinId, List<BesoinCompetenceDTO> links) {
        repository.deleteByBesoinId(besoinId);
        // V27 — multi-sélection sous-compétences/savoirs : déduplication défensive
        // (protège l'index unique uq_besoin_comp_besoin_comp_souscomp_savoir d'un 500).
        Map<String, BesoinCompetence> unique = new LinkedHashMap<>();
        links.stream()
                .filter(l -> l.getCompetenceId() != null)
                .forEach(l -> {
                    BesoinCompetence entity = BesoinCompetence.builder()
                            .besoinId(besoinId)
                            .domaineId(l.getDomaineId())
                            .competenceId(l.getCompetenceId())
                            .competenceNom(l.getCompetenceNom())
                            .savoirId(l.getSavoirId())
                            .savoirNom(l.getSavoirNom())
                            .sousCompetenceId(l.getSousCompetenceId())
                            .sousCompetenceNom(l.getSousCompetenceNom())
                            .build();
                    unique.putIfAbsent(dedupKey(entity), entity);
                });
        return repository.saveAll(List.copyOf(unique.values())).stream()
                .map(this::toDTO)
                .toList();
    }

    private static String dedupKey(BesoinCompetence e) {
        return e.getCompetenceId() + ":" + e.getSousCompetenceId() + ":" + e.getSavoirId();
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
                .sousCompetenceNom(e.getSousCompetenceNom())
                .build();
    }
}
