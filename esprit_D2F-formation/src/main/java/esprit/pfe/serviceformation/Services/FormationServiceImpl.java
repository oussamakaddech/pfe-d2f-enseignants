package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.CreateFormationRequest;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.UpdateFormationRequest;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookEventParameters;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
public class FormationServiceImpl implements FormationService {

    private static final ZoneId TZ = ZoneId.of("Africa/Tunis");
    private static final String FORMATION_INTROUVABLE = " introuvable";
    private static final String FORMATION_ID_PREFIX = "Formation avec l'id "; 

    @Value("${formation.organizer.email}")
    private String organizerEmail;

    private final FormationRepository formationRepository;
    private final FormationMapper formationMapper;

    // DSI §4/§2 — injection optionnelle : null si azure.ad.enabled=false
    private final OutlookCalendarService outlookCalendarService;

    public FormationServiceImpl(FormationRepository formationRepository,
                               FormationMapper formationMapper,
                               @org.springframework.lang.Nullable OutlookCalendarService outlookCalendarService) {
        this.formationRepository = formationRepository;
        this.formationMapper = formationMapper;
        this.outlookCalendarService = outlookCalendarService;
    }

    @Override
    @Transactional
    public FormationResponseDTO createFormation(CreateFormationRequest request) {
        Formation formation = formationMapper.toEntity(request);
        Formation saved = formationRepository.save(formation);

        // DSI §4/§2 — intégration Outlook conditionnelle (azure.ad.enabled=true requis)
        if (outlookCalendarService != null) {
            try {
                String eventId = createOutlookEvent(saved);
                if (eventId != null) {
                    saved.setCalendarEventId(eventId);
                    saved = formationRepository.save(saved);
                }
            } catch (Exception e) {
                log.warn("[Outlook] Impossible de créer l'événement pour la formation {} : {}",
                        saved.getIdFormation(), e.getMessage());
            }
        } else {
            log.debug("[Formation] Calendrier Outlook désactivé (azure.ad.enabled=false) — formation {} créée sans événement.", saved.getIdFormation());
        }

        return formationMapper.toResponseDTO(saved);
    }

    private String createOutlookEvent(Formation f) {
        if (f.getDateDebut() == null || f.getDateFin() == null) return null;

        String salle      = f.getSalle() != null && !f.getSalle().isBlank() ? f.getSalle() : "Salle-TBD";
        String titre      = f.getTitreFormation() != null ? f.getTitreFormation() : "Formation";
        String animateur  = resolveAnimateur(f);
        String subject    = "D2f-" + salle + "-" + titre + "-" + animateur;

        var start = f.getDateDebut().toInstant().atZone(TZ).withHour(8).withMinute(0).toOffsetDateTime();
        var end   = f.getDateFin().toInstant().atZone(TZ).withHour(17).withMinute(0).toOffsetDateTime();

        List<String> emails = (f.getAnimateurs() != null)
                ? f.getAnimateurs().stream().map(Enseignant::getMail).filter(m -> m != null && !m.isBlank()).toList()
                : List.of();

        String html = "<p><b>Formation :</b> " + titre + "</p>"
                + "<p><b>Salle :</b> " + salle + "</p>"
                + "<p><b>Animateur :</b> " + animateur + "</p>"
                + "<p><b>Début :</b> " + f.getDateDebut() + " &nbsp; <b>Fin :</b> " + f.getDateFin() + "</p>";

        OutlookEventParameters params = OutlookEventParameters.builder()
                .organizerEmail(organizerEmail)
                .subject(subject)
                .htmlContent(html)
                .start(start)
                .end(end)
                .salle(salle)
                .attendeeEmails(emails)
                .build();

        return outlookCalendarService.addEventToCalendarAndReturnIdWithTeamsUrl(params).getEventId();
    }

    private String resolveAnimateur(Formation f) {
        if (f.getAnimateurs() != null && !f.getAnimateurs().isEmpty()) {
            Enseignant a = f.getAnimateurs().get(0);
            return (a.getNom() + " " + a.getPrenom()).trim();
        }
        if (f.getExterneFormateurNom() != null && !f.getExterneFormateurNom().isBlank()) {
            return (f.getExterneFormateurNom() + " "
                    + (f.getExterneFormateurPrenom() != null ? f.getExterneFormateurPrenom() : "")).trim();
        }
        return "Animateur-TBD";
    }

    @Override
    @Transactional
    public FormationResponseDTO updateFormation(Long id, UpdateFormationRequest request) {
        Formation existingFormation = formationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        FORMATION_ID_PREFIX + id + FORMATION_INTROUVABLE));

        // Utilise le mapper pour la mise à jour partielle
        formationMapper.updateEntityFromRequest(request, existingFormation);

        Formation updated = formationRepository.save(existingFormation);
        return formationMapper.toResponseDTO(updated);
    }

    @Override
    @Transactional
    public void deleteFormation(Long id) {
        formationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        FORMATION_ID_PREFIX + id + FORMATION_INTROUVABLE));
        formationRepository.deleteById(id);
        log.info("Formation {} softly deleted", id);
    }

    @Override
    @Transactional(readOnly = true)
    public FormationResponseDTO getFormationById(Long id) {
        Formation formation = formationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        FORMATION_ID_PREFIX + id + FORMATION_INTROUVABLE));
        return formationMapper.toResponseDTO(formation);
    }

    @Override
    @Transactional(readOnly = true)
    public Formation getFormationByIdWithAllRelations(Long id) {
        return formationRepository.findByIdWithAllRelations(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        FORMATION_ID_PREFIX + id + FORMATION_INTROUVABLE));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<FormationResponseDTO> getAllFormations(Pageable pageable) {
        Page<Formation> formations = formationRepository.findAll(pageable);
        formations.forEach(f -> {
            if (f.getSeances() != null) Hibernate.initialize(f.getSeances());
            if (f.getFormationCompetences() != null) Hibernate.initialize(f.getFormationCompetences());
            if (f.getInscriptions() != null) Hibernate.initialize(f.getInscriptions());
        });

        // Convert to DTOs
        List<FormationResponseDTO> dtos = formations.stream()
                .map(formationMapper::toResponseDTO)
                .toList();

        return new PageImpl<>(dtos, pageable, formations.getTotalElements());
    }

    @Override
    @Transactional
    public FormationResponseDTO recoverDeletedFormation(Long id) {
        Formation deleted = formationRepository.findDeletedById(id);
        if (deleted == null) {
            throw new ResourceNotFoundException(
                    "Formation supprimée avec l'id " + id + FORMATION_INTROUVABLE);
        }

        // Recover by clearing the deleted_at timestamp
        deleted.setDeletedAt(null);
        Formation recovered = formationRepository.save(deleted);
        log.info("Formation {} recovered from soft delete", id);

        return formationMapper.toResponseDTO(recovered);
    }

    @Override
    @Transactional
    public FormationResponseDTO cloneFormation(Long sourceId, String newTitle) {
        Formation source = formationRepository.findByIdWithAllRelations(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Formation source avec l'id " + sourceId + FORMATION_INTROUVABLE));

        Formation cloned = new Formation();
        cloned.setTitreFormation(newTitle);
        cloned.setTypeBesoin(source.getTypeBesoin());
        cloned.setDomaine(source.getDomaine());
        cloned.setCompetence(source.getCompetence());
        cloned.setPopulationCible(source.getPopulationCible());
        cloned.setObjectifs(source.getObjectifs());
        cloned.setObjectifsPedago(source.getObjectifsPedago());
        cloned.setEvalMethods(source.getEvalMethods());
        cloned.setTypeFormation(source.getTypeFormation());
        cloned.setExterneFormateurNom(source.getExterneFormateurNom());
        cloned.setExterneFormateurPrenom(source.getExterneFormateurPrenom());
        cloned.setExterneFormateurEmail(source.getExterneFormateurEmail());
        cloned.setOrganismeRefExterne(source.getOrganismeRefExterne());
        cloned.setBureauFormationNom(source.getBureauFormationNom());
        cloned.setBureauFormationMail(source.getBureauFormationMail());
        cloned.setBureauFormationTelephone(source.getBureauFormationTelephone());
        cloned.setDateDebut(source.getDateDebut());
        cloned.setDateFin(source.getDateFin());
        cloned.setEtatFormation(source.getEtatFormation());
        cloned.setCoutTransport(source.getCoutTransport());
        cloned.setCoutHebergement(source.getCoutHebergement());
        cloned.setCoutRepas(source.getCoutRepas());
        cloned.setCoutFormation(source.getCoutFormation());
        cloned.setPrerequis(source.getPrerequis());
        cloned.setAcquis(source.getAcquis());
        cloned.setIndicateurs(source.getIndicateurs());
        cloned.setChargeHoraireGlobal(source.getChargeHoraireGlobal());
        cloned.setCertifGenerated(false);
        cloned.setUp(source.getUp());
        cloned.setDepartement(source.getDepartement());
        cloned.setInscriptionsOuvertes(false);
        cloned.setOuverte(false);
        cloned.setPeriodCode(source.getPeriodCode());
        cloned.setCustomPeriodLabel(source.getCustomPeriodLabel());
        cloned.setSalle(source.getSalle());

        Formation saved = formationRepository.save(cloned);
        log.info("Formation {} cloned from source {} with new title '{}'",
                saved.getIdFormation(), sourceId, newTitle);

        return formationMapper.toResponseDTO(saved);
    }
}
