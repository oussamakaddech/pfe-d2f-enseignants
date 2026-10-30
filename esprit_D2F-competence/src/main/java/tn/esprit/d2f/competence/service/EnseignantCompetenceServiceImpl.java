package tn.esprit.d2f.competence.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.AffectationGroupeeRequest;
import tn.esprit.d2f.competence.dto.AffectationGroupeeResultDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.dto.PerimetreAffectationDTO;
import tn.esprit.d2f.competence.entity.EnseignantCompetence;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;

import org.springframework.data.domain.PageImpl;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class EnseignantCompetenceServiceImpl implements IEnseignantCompetenceService {

    private final EnseignantCompetenceRepository enseignantCompetenceRepository;
    private final SavoirRepository savoirRepository;
    private final SousCompetenceRepository sousCompetenceRepository;
    private final CompetenceRepository competenceRepository;
    private final CompetenceMapper competenceMapper;
    private final IEnseignantCompetenceService self;
    private final AffectationScopeService affectationScopeService;

    public EnseignantCompetenceServiceImpl(EnseignantCompetenceRepository enseignantCompetenceRepository,
                                           SavoirRepository savoirRepository,
                                           SousCompetenceRepository sousCompetenceRepository,
                                           CompetenceRepository competenceRepository,
                                           CompetenceMapper competenceMapper,
                                           @Lazy IEnseignantCompetenceService self,
                                           AffectationScopeService affectationScopeService) {
        this.enseignantCompetenceRepository = enseignantCompetenceRepository;
        this.savoirRepository = savoirRepository;
        this.sousCompetenceRepository = sousCompetenceRepository;
        this.competenceRepository = competenceRepository;
        this.competenceMapper = competenceMapper;
        this.self = self;
        this.affectationScopeService = affectationScopeService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EnseignantCompetenceDTO> getAll(Pageable pageable) {
        // findAllFetched uses JOIN FETCH to load the full savoir→sousCompetence→competence→domaine
        // graph in a single query, eliminating the N+1 problem.
        return enseignantCompetenceRepository.findAllFetched(pageable)
                .map(competenceMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignant(String enseignantId) {
        return enseignantCompetenceRepository.findByEnseignantId(enseignantId).stream()
                .map(competenceMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EnseignantCompetenceDTO> getCompetencesByEnseignant(String enseignantId, Pageable pageable) {
        return paginate(self.getCompetencesByEnseignant(enseignantId), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndDomaine(String enseignantId, Long domaineId) {
        return enseignantCompetenceRepository.findByEnseignantIdAndDomaineId(enseignantId, domaineId).stream()
                .map(competenceMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EnseignantCompetenceDTO> getCompetencesByEnseignantAndDomaine(String enseignantId, Long domaineId, Pageable pageable) {
        return paginate(self.getCompetencesByEnseignantAndDomaine(enseignantId, domaineId), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndCompetence(String enseignantId, Long competenceId) {
        return enseignantCompetenceRepository.findByEnseignantIdAndCompetenceId(enseignantId, competenceId).stream()
                .map(competenceMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EnseignantCompetenceDTO> getCompetencesByEnseignantAndCompetence(String enseignantId, Long competenceId, Pageable pageable) {
        return paginate(self.getCompetencesByEnseignantAndCompetence(enseignantId, competenceId), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getCompetencesByEnseignantAndNiveau(String enseignantId, NiveauMaitrise niveau) {
        return enseignantCompetenceRepository.findByEnseignantIdAndNiveau(enseignantId, niveau).stream()
                .map(competenceMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EnseignantCompetenceDTO> getCompetencesByEnseignantAndNiveau(String enseignantId, NiveauMaitrise niveau, Pageable pageable) {
        return paginate(self.getCompetencesByEnseignantAndNiveau(enseignantId, niveau), pageable);
    }

    @Override
    @Transactional
    @CacheEvict(value = "ec-count", allEntries = true)
    public EnseignantCompetenceDTO assignCompetence(EnseignantCompetenceRequest request) {
        // Périmètre : un CUP / chef de département n'affecte que les enseignants
        // de son UP / département (ADMIN : global). Deny-by-default.
        affectationScopeService.assertCanManage(request.getEnseignantId());

        // Vérifier que le savoir existe
        Savoir savoir = savoirRepository.findById(request.getSavoirId())
                .orElseThrow(() -> new EntityNotFoundException("Savoir non trouvé avec l'id: " + request.getSavoirId()));

        // Vérifier doublon
        if (enseignantCompetenceRepository.existsByEnseignantIdAndSavoirId(request.getEnseignantId(), request.getSavoirId())) {
            throw new IllegalArgumentException("L'enseignant possède déjà ce savoir. Utilisez la mise à jour de niveau.");
        }

        EnseignantCompetence ec = EnseignantCompetence.builder()
                .enseignantId(request.getEnseignantId())
                .savoir(savoir)
                .niveau(request.getNiveau() != null ? request.getNiveau() : NiveauMaitrise.N1_DEBUTANT)
                .dateAcquisition(request.getDateAcquisition())
                .commentaire(request.getCommentaire())
                .build();

        EnseignantCompetence saved = enseignantCompetenceRepository.save(ec);
        log.info("Compétence assignée: enseignant={}, savoir={}, niveau={}", 
                saved.getEnseignantId(), savoir.getNom(), saved.getNiveau());
        return competenceMapper.toDTO(saved);
    }

    /**
     * {@inheritDoc}
     *
     * <p>Affecter une compétence = affecter <b>tous</b> ses savoirs (directs et
     * portés par ses sous-compétences) ; affecter une sous-compétence = ses
     * savoirs et ceux de ses descendantes. La couverture n'est jamais partielle.
     * Les savoirs déjà affectés sont ignorés (aucun doublon, niveau inchangé) :
     * l'opération est donc idempotente et rejouable sans risque.</p>
     */
    @Override
    @Transactional
    @CacheEvict(value = "ec-count", allEntries = true)
    public AffectationGroupeeResultDTO assignGroupee(AffectationGroupeeRequest request) {
        String enseignantId = request.getEnseignantId() == null ? "" : request.getEnseignantId().trim();
        if (enseignantId.isEmpty()) {
            throw new IllegalArgumentException("L'identifiant de l'enseignant est obligatoire");
        }
        // Périmètre d'écriture (ADMIN global, CUP = son UP, chef = son département).
        affectationScopeService.assertCanManage(enseignantId);

        // Dédoublonnage par id : une liste explicite peut répéter un savoir, et un
        // savoir peut être atteint par deux chemins (compétence + sous-compétence).
        Map<Long, Savoir> cibles = new LinkedHashMap<>();
        resolveSavoirsCibles(request).forEach(s -> {
            if (s.getId() != null) cibles.putIfAbsent(s.getId(), s);
        });

        Set<Long> dejaAffectes = enseignantCompetenceRepository.findByEnseignantId(enseignantId).stream()
                .map(existante -> existante.getSavoir() != null ? existante.getSavoir().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        NiveauMaitrise niveau = request.getNiveau() != null ? request.getNiveau() : NiveauMaitrise.N1_DEBUTANT;
        List<EnseignantCompetence> aCreer = new ArrayList<>();
        for (Savoir savoir : cibles.values()) {
            if (dejaAffectes.contains(savoir.getId())) {
                continue;
            }
            aCreer.add(EnseignantCompetence.builder()
                    .enseignantId(enseignantId)
                    .savoir(savoir)
                    .niveau(niveau)
                    .dateAcquisition(request.getDateAcquisition())
                    .commentaire(request.getCommentaire())
                    .build());
        }

        if (!aCreer.isEmpty()) {
            enseignantCompetenceRepository.saveAll(aCreer);
        }

        int deja = cibles.size() - aCreer.size();
        log.info("Affectation groupée: enseignant={}, périmètre={}, ciblés={}, créés={}, déjà affectés={}",
                enseignantId, perimetreLabel(request), cibles.size(), aCreer.size(), deja);

        return AffectationGroupeeResultDTO.builder()
                .enseignantId(enseignantId)
                .competenceId(request.getCompetenceId())
                .sousCompetenceId(request.getSousCompetenceId())
                .total(cibles.size())
                .crees(aCreer.size())
                .dejaAffectes(deja)
                .savoirIds(new ArrayList<>(cibles.keySet()))
                .build();
    }

    /** Résout les savoirs ciblés selon le périmètre fourni (savoirIds prioritaire). */
    private List<Savoir> resolveSavoirsCibles(AffectationGroupeeRequest request) {
        if (request.getSavoirIds() != null && !request.getSavoirIds().isEmpty()) {
            List<Long> ids = request.getSavoirIds().stream()
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            if (ids.isEmpty()) {
                throw new IllegalArgumentException("La liste des savoirs ne contient aucun identifiant exploitable");
            }
            List<Savoir> savoirs = savoirRepository.findAllById(ids);
            if (savoirs.size() != ids.size()) {
                Set<Long> trouves = savoirs.stream().map(Savoir::getId).collect(Collectors.toSet());
                List<Long> manquants = ids.stream().filter(id -> !trouves.contains(id)).toList();
                throw new EntityNotFoundException("Savoir(s) introuvable(s) : " + manquants);
            }
            return savoirs;
        }

        if (request.getSousCompetenceId() != null) {
            Long racineId = request.getSousCompetenceId();
            if (!sousCompetenceRepository.existsById(racineId)) {
                throw new EntityNotFoundException("Sous-compétence non trouvée avec l'id: " + racineId);
            }
            Set<Long> ids = collectSousCompetenceIds(racineId);
            return savoirRepository.findBySousCompetenceIdIn(ids);
        }

        if (request.getCompetenceId() != null) {
            Long competenceId = request.getCompetenceId();
            if (!competenceRepository.existsById(competenceId)) {
                throw new EntityNotFoundException("Compétence non trouvée avec l'id: " + competenceId);
            }
            return savoirRepository.findByCompetenceWithSousCompetences(competenceId);
        }

        throw new IllegalArgumentException(
                "Précisez le périmètre à affecter : competenceId, sousCompetenceId ou savoirIds");
    }

    /** Identifiants d'une sous-compétence et de toutes ses descendantes (garde anti-cycle). */
    private Set<Long> collectSousCompetenceIds(Long racineId) {
        Set<Long> ids = new LinkedHashSet<>();
        Deque<Long> pile = new ArrayDeque<>();
        pile.push(racineId);
        while (!pile.isEmpty()) {
            Long courant = pile.pop();
            if (!ids.add(courant)) {
                continue;
            }
            sousCompetenceRepository.findByParentId(courant).forEach(enfant -> {
                if (enfant.getId() != null) {
                    pile.push(enfant.getId());
                }
            });
        }
        return ids;
    }

    private String perimetreLabel(AffectationGroupeeRequest request) {
        if (request.getSavoirIds() != null && !request.getSavoirIds().isEmpty()) return "savoirIds";
        if (request.getSousCompetenceId() != null) return "sousCompetence:" + request.getSousCompetenceId();
        if (request.getCompetenceId() != null) return "competence:" + request.getCompetenceId();
        return "aucun";
    }

    @Override
    @Transactional
    @CacheEvict(value = "ec-count", allEntries = true)
    public EnseignantCompetenceDTO updateNiveau(Long id, NiveauMaitrise niveau) {
        EnseignantCompetence ec = enseignantCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("EnseignantCompetence non trouvée avec l'id: " + id));
        affectationScopeService.assertCanManage(ec.getEnseignantId());
        ec.setNiveau(niveau);
        EnseignantCompetence saved = enseignantCompetenceRepository.save(ec);
        log.info("Niveau mis à jour: id={}, nouveau niveau={}", id, niveau);
        return competenceMapper.toDTO(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "ec-count", allEntries = true)
    public void removeCompetence(Long id) {
        EnseignantCompetence ec = enseignantCompetenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("EnseignantCompetence non trouvée avec l'id: " + id));
        affectationScopeService.assertCanManage(ec.getEnseignantId());
        enseignantCompetenceRepository.deleteById(id);
        log.info("Compétence enseignant supprimée: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public PerimetreAffectationDTO getPerimetre() {
        return affectationScopeService.describePerimetre();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "ec-count", key = "#enseignantId")
    public long countCompetences(String enseignantId) {
        return enseignantCompetenceRepository.countByEnseignantId(enseignantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnseignantCompetenceDTO> getByCompetenceId(Long competenceId) {
        return enseignantCompetenceRepository.findByCompetenceId(competenceId).stream()
                .map(competenceMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EnseignantCompetenceDTO> getByCompetenceId(Long competenceId, Pageable pageable) {
        return paginate(self.getByCompetenceId(competenceId), pageable);
    }

    private Page<EnseignantCompetenceDTO> paginate(List<EnseignantCompetenceDTO> items, Pageable pageable) {
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), items.size());
        return new PageImpl<>(from >= items.size() ? List.of() : items.subList(from, to), pageable, items.size());
    }
}
