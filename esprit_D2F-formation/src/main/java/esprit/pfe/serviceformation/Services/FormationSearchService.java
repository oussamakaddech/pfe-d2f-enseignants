package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.FormationFilter;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormationSearchService {

    private final FormationRepository formationRepository;
    private final FormationMapper formationMapper;

    @Transactional(readOnly = true)
    public Page<FormationResponseDTO> searchFormations(FormationFilter filter, Pageable pageable) {
        log.debug("Searching formations with filter: {}", filter);

        // Get IDs matching all criteria from repository custom queries
        List<Long> formationIds = getMatchingFormationIds(filter);

        // Fetch full entities with all relations for those IDs
        List<Formation> formations = formationIds.stream()
                .map(id -> formationRepository.findByIdWithAllRelations(id).orElse(null))
                .filter(f -> f != null)
                .toList();

        // Apply pagination manually (repository doesn't support this complex query with pagination)
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), formations.size());
        List<Formation> paginatedFormations = formations.subList(start, end);

        // Convert to DTOs
        List<FormationResponseDTO> dtos = paginatedFormations.stream()
                .map(formationMapper::toResponseDTO)
                .toList();

        return new PageImpl<>(dtos, pageable, formations.size());
    }

    @Transactional(readOnly = true)
    public Page<FormationResponseDTO> searchByTitle(String title, Pageable pageable) {
        log.debug("Searching formations by title: {}", title);

        Page<Formation> page = formationRepository.findAll(pageable);

        List<FormationResponseDTO> filtered = page.getContent().stream()
                .filter(f -> f.getTitreFormation() != null &&
                           f.getTitreFormation().toLowerCase().contains(title.toLowerCase()))
                .map(formationMapper::toResponseDTO)
                .toList();

        // Recalculate pagination on filtered results
        long total = formationRepository.findAll().stream()
                .filter(f -> f.getTitreFormation() != null &&
                           f.getTitreFormation().toLowerCase().contains(title.toLowerCase()))
                .count();

        return new PageImpl<>(filtered, pageable, total);
    }

    @Transactional(readOnly = true)
    public Page<FormationResponseDTO> searchByState(String state, Pageable pageable) {
        log.debug("Searching formations by state: {}", state);

        Page<Formation> page = formationRepository.findAll(pageable);

        List<FormationResponseDTO> filtered = page.getContent().stream()
                .filter(f -> f.getEtatFormation() != null &&
                           f.getEtatFormation().toString().equals(state))
                .map(formationMapper::toResponseDTO)
                .toList();

        long total = formationRepository.findAll().stream()
                .filter(f -> f.getEtatFormation() != null &&
                           f.getEtatFormation().toString().equals(state))
                .count();

        return new PageImpl<>(filtered, pageable, total);
    }

    @Transactional(readOnly = true)
    public Page<FormationResponseDTO> searchByDomain(String domain, Pageable pageable) {
        log.debug("Searching formations by domain: {}", domain);

        Page<Formation> page = formationRepository.findAll(pageable);

        List<FormationResponseDTO> filtered = page.getContent().stream()
                .filter(f -> f.getDomaine() != null && f.getDomaine().equals(domain))
                .map(formationMapper::toResponseDTO)
                .toList();

        long total = formationRepository.findAll().stream()
                .filter(f -> f.getDomaine() != null && f.getDomaine().equals(domain))
                .count();

        return new PageImpl<>(filtered, pageable, total);
    }

    @SuppressWarnings({"java:S3776", "java:S1126"})
    private List<Long> getMatchingFormationIds(FormationFilter filter) {
        // Get all formation IDs that match the filter criteria
        // The repository's custom queries already handle the filtering
        return formationRepository.findAll().stream()
                .filter(f -> {
                    if (filter.getCompetence() != null && !filter.getCompetence().equals(f.getCompetence())) {
                        return false;
                    }
                    if (filter.getDomaine() != null && !filter.getDomaine().equals(f.getDomaine())) {
                        return false;
                    }
                    if (filter.getUpId() != null && (f.getUp() == null || !filter.getUpId().equals(f.getUp().getId()))) {
                        return false;
                    }
                    if (filter.getDeptId() != null && (f.getDepartement() == null || !filter.getDeptId().equals(f.getDepartement().getId()))) {
                        return false;
                    }
                    if (filter.getOuverte() != null && filter.getOuverte() != f.isOuverte()) {
                        return false;
                    }
                    if (filter.getEtats() != null && !filter.getEtats().contains(f.getEtatFormation())) {
                        return false;
                    }
                    if (filter.getStart() != null && f.getDateDebut().before(filter.getStart())) {
                        return false;
                    }
                    if (filter.getEnd() != null && f.getDateDebut().after(filter.getEnd())) {
                        return false;
                    }
                    return true;
                })
                .map(Formation::getIdFormation)
                .toList();
    }
}
