package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.CreateFormationRequest;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.UpdateFormationRequest;
import esprit.pfe.serviceformation.entities.Formation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for Formation operations.
 * Provides CRUD and advanced business operations for formations.
 */
public interface FormationService {

    /**
     * Create a new formation
     * @param request formation creation request with validation
     * @return created formation as response DTO
     */
    FormationResponseDTO createFormation(CreateFormationRequest request);

    /**
     * Update an existing formation
     * @param id formation ID
     * @param request update request with partial update support
     * @return updated formation as response DTO
     */
    FormationResponseDTO updateFormation(Long id, UpdateFormationRequest request);

    /**
     * Delete (soft delete) a formation
     * @param id formation ID
     */
    void deleteFormation(Long id);

    /**
     * Get formation by ID
     * @param id formation ID
     * @return formation as response DTO
     */
    FormationResponseDTO getFormationById(Long id);

    /**
     * Get all formations with pagination
     * @param pageable pagination parameters
     * @return paginated formations as response DTOs
     */
    Page<FormationResponseDTO> getAllFormations(Pageable pageable);

    /**
     * Get formation by ID with all relations loaded (for detail view)
     * @param id formation ID
     * @return formation with all relations
     */
    Formation getFormationByIdWithAllRelations(Long id);
}
