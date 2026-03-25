package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteRequest;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.entity.CompetencePrerequisite;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.exception.BusinessException;
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CompetencePrerequisiteServiceImpl implements ICompetencePrerequisiteService {

    private final CompetencePrerequisiteRepository prerequisiteRepository;
    private final CompetenceRepository competenceRepository;
    private final EnseignantCompetenceRepository enseignantCompetenceRepository;

    private static final Map<NiveauMaitrise, String> NIVEAU_LABELS = new EnumMap<>(NiveauMaitrise.class);

    static {
        NIVEAU_LABELS.put(NiveauMaitrise.N1_DEBUTANT, "N1 - Debutant");
        NIVEAU_LABELS.put(NiveauMaitrise.N2_ELEMENTAIRE, "N2 - Elementaire");
        NIVEAU_LABELS.put(NiveauMaitrise.N3_INTERMEDIAIRE, "N3 - Intermediaire");
        NIVEAU_LABELS.put(NiveauMaitrise.N4_AVANCE, "N4 - Avance");
        NIVEAU_LABELS.put(NiveauMaitrise.N5_EXPERT, "N5 - Expert");
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetencePrerequisiteDTO> getPrerequisitesByCompetence(Long competenceId) {
        ensureCompetenceExists(competenceId);
        return withLabels(prerequisiteRepository.findByCompetenceId(competenceId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetencePrerequisiteDTO> getCompetencesNecessitant(Long prerequisiteId) {
        ensureCompetenceExists(prerequisiteId);
        return withLabels(prerequisiteRepository.findByPrerequisiteId(prerequisiteId));
    }

    @Override
    @Transactional
    public CompetencePrerequisiteDTO addPrerequisite(Long competenceId, CompetencePrerequisiteRequest req) {
        if (req == null) {
            throw new BusinessException("Le corps de la requete est obligatoire.");
        }

        if (competenceId == null) {
            throw new BusinessException("L'identifiant de la competence est obligatoire.");
        }

        Long prerequisiteId = req.getPrerequisiteId();

        if (prerequisiteId == null) {
            throw new BusinessException("Le champ prerequisiteId est obligatoire.");
        }

        if (req.getNiveauMinimum() == null) {
            throw new BusinessException("Le champ niveauMinimum est obligatoire.");
        }

        if (competenceId.equals(prerequisiteId)) {
            throw new BusinessException("Une competence ne peut pas etre son propre prerequis.");
        }

        if (prerequisiteRepository.existsByCompetenceIdAndPrerequisiteId(competenceId, prerequisiteId)) {
            throw new BusinessException("Ce prerequis est deja enregistre pour cette competence.");
        }

        if (createsCycle(competenceId, prerequisiteId)) {
            throw new BusinessException("Ajout impossible : cree un cycle de prerequis.");
        }

        Competence competence = competenceRepository.findById(competenceId)
                .orElseThrow(() -> new EntityNotFoundException("Competence non trouvee avec l'id: " + competenceId));

        Competence prerequisite = competenceRepository.findById(prerequisiteId)
                .orElseThrow(() -> new EntityNotFoundException("Competence prerequise non trouvee avec l'id: " + prerequisiteId));

        CompetencePrerequisite saved = prerequisiteRepository.save(
                CompetencePrerequisite.builder()
                        .competence(competence)
                        .prerequisite(prerequisite)
                        .niveauMinimum(req.getNiveauMinimum())
                        .description(req.getDescription())
                        .build()
        );

        return toDTO(saved);
    }

    @Override
    @Transactional
    public CompetencePrerequisiteDTO updateNiveauMinimum(Long id, NiveauMaitrise niveauMinimum) {
        CompetencePrerequisite existing = prerequisiteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Prerequis non trouve avec l'id: " + id));
        existing.setNiveauMinimum(niveauMinimum);
        CompetencePrerequisite saved = prerequisiteRepository.save(existing);
        return toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean prerequisiteBelongsToCompetence(Long competenceId, Long prerequisiteRelationId) {
        return prerequisiteRepository.findByIdAndCompetenceId(prerequisiteRelationId, competenceId).isPresent();
    }

    @Override
    @Transactional
    public void removePrerequisite(Long id) {
        if (!prerequisiteRepository.existsById(id)) {
            throw new EntityNotFoundException("Prerequis non trouve avec l'id: " + id);
        }
        prerequisiteRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean checkEnseignantMeetsPrerequisites(Long competenceId, String enseignantId) {
        List<CompetencePrerequisiteDTO> prerequisites = getPrerequisitesByCompetence(competenceId);
        return prerequisites.stream().allMatch(pr -> {
            NiveauMaitrise niveauActuel = getBestNiveauForCompetence(enseignantId, pr.getPrerequisiteId());
            return niveauActuel != null && niveauActuel.ordinal() >= pr.getNiveauMinimum().ordinal();
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> checkEnseignantEligibilityDetails(Long competenceId, String enseignantId) {
        List<CompetencePrerequisiteDTO> prerequisites = getPrerequisitesByCompetence(competenceId);

        List<Map<String, Object>> satisfaits = new ArrayList<>();
        List<Map<String, Object>> manquants = new ArrayList<>();

        for (CompetencePrerequisiteDTO pr : prerequisites) {
            NiveauMaitrise niveauActuel = getBestNiveauForCompetence(enseignantId, pr.getPrerequisiteId());
            boolean ok = niveauActuel != null && niveauActuel.ordinal() >= pr.getNiveauMinimum().ordinal();

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("prerequisite", pr);
                entry.put("niveauActuel", niveauActuel);
                entry.put("niveauActuelLabel", niveauActuel != null ? niveauToLabel(niveauActuel) : "Non acquis");

            if (ok) {
                satisfaits.add(entry);
            } else {
                manquants.add(entry);
            }
        }

        return Map.of(
                "eligible", manquants.isEmpty(),
                "prerequisitesSatisfaits", satisfaits,
                "prerequisitesManquants", manquants
        );
    }

    @Override
    @Transactional(readOnly = true)
    public long countByCompetenceId(Long competenceId) {
        return prerequisiteRepository.countByCompetenceId(competenceId);
    }

    private boolean createsCycle(Long targetCompetenceId, Long candidatePrerequisiteId) {
        return hasPathToTarget(candidatePrerequisiteId, targetCompetenceId, new HashSet<>());
    }

    private boolean hasPathToTarget(Long currentCompetenceId, Long targetCompetenceId, Set<Long> visited) {
        if (currentCompetenceId == null || targetCompetenceId == null) {
            return false;
        }

        if (!visited.add(currentCompetenceId)) {
            return false;
        }
        if (currentCompetenceId.equals(targetCompetenceId)) {
            return true;
        }

        List<Long> nextPrerequisites = prerequisiteRepository.findPrerequisiteIdsByCompetenceId(currentCompetenceId);
        for (Long next : nextPrerequisites) {
            if (hasPathToTarget(next, targetCompetenceId, visited)) {
                return true;
            }
        }
        return false;
    }

    private void ensureCompetenceExists(Long id) {
        if (!competenceRepository.existsById(id)) {
            throw new EntityNotFoundException("Competence non trouvee avec l'id: " + id);
        }
    }

    private NiveauMaitrise getBestNiveauForCompetence(String enseignantId, Long competenceId) {
        List<EnseignantCompetence> records =
                enseignantCompetenceRepository.findByEnseignantIdAndCompetenceId(enseignantId, competenceId);

        return records.stream()
                .map(EnseignantCompetence::getNiveau)
                .max(Enum::compareTo)
                .orElse(null);
    }

    private CompetencePrerequisiteDTO toDTO(CompetencePrerequisite cp) {
        return CompetencePrerequisiteDTO.builder()
                .id(cp.getId())
                .competenceId(cp.getCompetence().getId())
                .competenceNom(cp.getCompetence().getNom())
                .prerequisiteId(cp.getPrerequisite().getId())
                .prerequisiteNom(cp.getPrerequisite().getNom())
                .prerequisiteCode(cp.getPrerequisite().getCode())
                .niveauMinimum(cp.getNiveauMinimum())
                .niveauMinimumLabel(niveauToLabel(cp.getNiveauMinimum()))
                .description(cp.getDescription())
                .createdAt(cp.getCreatedAt())
                .build();
    }

    private List<CompetencePrerequisiteDTO> withLabels(List<CompetencePrerequisiteDTO> list) {
        list.forEach(dto -> dto.setNiveauMinimumLabel(niveauToLabel(dto.getNiveauMinimum())));
        return list;
    }

    private String niveauToLabel(NiveauMaitrise niveau) {
        return NIVEAU_LABELS.getOrDefault(niveau, String.valueOf(niveau));
    }
}
