package esprit.pfe.serviceformation.services.calendar;

import esprit.pfe.serviceformation.common.PageResponse;
import esprit.pfe.serviceformation.dto.calendar.CalendarFormationDTO;
import esprit.pfe.serviceformation.dto.calendar.CalendarParticipantDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.repositories.FormationParticipantEmailRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Lectures paginées orientées calendrier : formations planifiées, détail,
 * participants.
 */
@Service
@RequiredArgsConstructor
public class CalendarQueryService {

    private final FormationRepository formationRepository;
    private final SeanceFormationRepository seanceRepository;
    private final FormationParticipantEmailRepository participantEmailRepository;

    @Transactional(readOnly = true)
    public PageResponse<CalendarFormationDTO> listFormations(String titre, String etat, Pageable pageable) {
        EtatFormation etatEnum = parseEtat(etat);
        Page<Formation> page = formationRepository.findCalendarFormations(
                blankToNull(titre), etatEnum, pageable);
        return PageResponse.of(page.map(this::toDto).getContent(), page);
    }

    @Transactional(readOnly = true)
    public CalendarFormationDTO getFormation(Long id) {
        Formation formation = formationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formation introuvable : " + id));
        return toDto(formation);
    }

    @Transactional(readOnly = true)
    public PageResponse<CalendarParticipantDTO> getParticipants(Long formationId, Pageable pageable) {
        if (!formationRepository.existsById(formationId)) {
            throw new ResourceNotFoundException("Formation introuvable : " + formationId);
        }
        Page<CalendarParticipantDTO> page = participantEmailRepository
                .findByFormationId(formationId, pageable)
                .map(p -> CalendarParticipantDTO.builder()
                        .email(p.getEmail())
                        .matchedEnseignant(p.isMatchedEnseignant())
                        .build());
        return PageResponse.from(page);
    }

    private CalendarFormationDTO toDto(Formation formation) {
        return CalendarFormationDTO.builder()
                .idFormation(formation.getIdFormation())
                .titre(formation.getTitreFormation())
                .etat(formation.getEtatFormation() != null ? formation.getEtatFormation().name() : null)
                .dateDebut(toLocalDate(formation.getDateDebut()))
                .dateFin(toLocalDate(formation.getDateFin()))
                .salle(formation.getSalle())
                .responsable(formation.getResponsableName())
                .sessionsCount(seanceRepository.countByFormation_IdFormation(formation.getIdFormation()))
                .participantsCount(participantEmailRepository.countByFormationId(formation.getIdFormation()))
                .build();
    }

    private EtatFormation parseEtat(String etat) {
        if (etat == null || etat.isBlank()) {
            return null;
        }
        try {
            return EtatFormation.valueOf(etat.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("État de formation inconnu : " + etat);
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static java.time.LocalDate toLocalDate(LocalDate date) {
        return date;
    }
}
