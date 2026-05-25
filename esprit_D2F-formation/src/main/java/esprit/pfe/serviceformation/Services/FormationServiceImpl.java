package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.microsoft.OutlookCalendarService;
import esprit.pfe.serviceformation.microsoft.OutlookEventParameters;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class FormationServiceImpl implements FormationService {

    private static final ZoneId TZ = ZoneId.of("Africa/Tunis");

    @Value("${formation.organizer.email}")
    private String organizerEmail;

    private final FormationRepository formationRepository;

    // DSI §4/§2 — injection optionnelle : null si azure.ad.enabled=false
    private final OutlookCalendarService outlookCalendarService;

    public FormationServiceImpl(FormationRepository formationRepository,
                                @org.springframework.lang.Nullable OutlookCalendarService outlookCalendarService) {
        this.formationRepository = formationRepository;
        this.outlookCalendarService = outlookCalendarService;
    }

    @Override
    public Formation createFormation(Formation formation) {
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
            log.info("[Formation] Calendrier Outlook désactivé (azure.ad.enabled=false) — formation {} créée sans événement.", saved.getIdFormation());
        }
        return saved;
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
    public Formation updateFormation(Long id, Formation formation) {
        Optional<Formation> existingFormation = formationRepository.findById(id);
        if(existingFormation.isPresent()){
            Formation f = existingFormation.get();
            // Mise à jour des champs de la formation
            f.setTitreFormation(formation.getTitreFormation());
            f.setTypeFormation(formation.getTypeFormation());
            f.setDateDebut(formation.getDateDebut());
            f.setDateFin(formation.getDateFin());
            f.setEtatFormation(formation.getEtatFormation());
            f.setCoutFormation(formation.getCoutFormation());
            f.setOrganismeRefExterne(formation.getOrganismeRefExterne());
            f.setChargeHoraireGlobal(formation.getChargeHoraireGlobal());
            f.setPeriodCode(formation.getPeriodCode());
            f.setCustomPeriodLabel(formation.getCustomPeriodLabel());
            // Mettez à jour les associations si nécessaire
            return formationRepository.save(f);
        } else {
            throw new IllegalArgumentException("Formation introuvable avec l'id : " + id);
        }
    }

    @Override
    public void deleteFormation(Long id) {
        if (!formationRepository.existsById(id)) {
            throw new IllegalArgumentException("Impossible de supprimer : Formation introuvable avec l'id : " + id);
        }
        formationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Formation getFormationById(Long id) {
        return formationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable avec l'id : " + id));
    }
    @Override
    @Transactional(readOnly = true)
    public Page<Formation> getAllFormations(Pageable pageable) {
        Page<Formation> formations = formationRepository.findAll(pageable);
        formations.forEach(f -> {
            if (f.getSeances() != null) Hibernate.initialize(f.getSeances());
            if (f.getFormationCompetences() != null) Hibernate.initialize(f.getFormationCompetences());
            if (f.getInscriptions() != null) Hibernate.initialize(f.getInscriptions());
        });
        return formations;
    }
}
