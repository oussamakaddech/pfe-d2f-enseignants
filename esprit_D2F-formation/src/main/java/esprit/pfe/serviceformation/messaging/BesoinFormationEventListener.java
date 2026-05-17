package esprit.pfe.serviceformation.messaging;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.PeriodCode;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class BesoinFormationEventListener {
    private static final String QUEUE = "BesoinFormationApprovedQueue";
    private static final Logger log = LoggerFactory.getLogger(BesoinFormationEventListener.class);

    private final FormationRepository formationRepository;
    private final UpRepository upRepo;
    private final DeptRepository deptRepo;

    public BesoinFormationEventListener(FormationRepository formationRepository,
                                        UpRepository upRepo,
                                        DeptRepository deptRepo) {
        this.formationRepository = formationRepository;
        this.upRepo = upRepo;
        this.deptRepo = deptRepo;
    }

    @RabbitListener(queues = QUEUE)
    public void onBesoinApproved(BesoinFormationApprovedEvent evt) {
        // 1) Instanciation
        Formation f = new Formation();

        // 2) Mapping manuel DTO → Entité
        f.setIdBesoinFormation(       evt.getIdBesoinFormation());
        f.setTitreFormation(          evt.getTitre() != null ? evt.getTitre() : evt.getProgrammeFormation());
        f.setDomaine(                 evt.getTheme());
        f.setPopulationCible(         evt.getPublicCible());
        f.setObjectifs(               evt.getObjectifFormation());
        f.setObjectifsPedago(         evt.getObjectifsPedagogiques());
        f.setEvalMethods(             evt.getMethodesEvaluationAcquis());
        f.setPrerequis(               evt.getPrerequis());
        f.setIndicateurs(             evt.getMoyensPedagogiques());
        f.setChargeHoraireGlobal(     evt.getDureeFormation());
        
        if (evt.getPeriodCode() != null) {
            try {
                f.setPeriodCode(PeriodCode.valueOf(evt.getPeriodCode()));
            } catch (Exception e) {
                f.setPeriodCode(PeriodCode.OTHER);
            }
        }
        f.setCustomPeriodLabel(evt.getCustomPeriodLabel());
        f.setTypeBesoin(evt.getTypeBesoin());

        // 3) Liens JPA vers Up et Dept
        upRepo.findById(evt.getUp())
                .ifPresent(f::setUp);

        deptRepo.findById(evt.getDepartement())
                .ifPresent(f::setDepartement);

        // 4) Initialisation métier
        f.setTypeFormation(TypeFormation.INTERNE);
        f.setEtatFormation(EtatFormation.NOUVEAU);
        f.setDateDebut(new Date());
        f.setDateFin(  new Date());

        // 5) Persistance en base de données
        try {
            Formation saved = formationRepository.save(f);
            log.info("Formation créée avec succès [id={}, besoinId={}, titre={}]",
                    saved.getIdFormation(), saved.getIdBesoinFormation(), saved.getTitreFormation());
        } catch (DataIntegrityViolationException ex) {
            log.error("Doublon détecté lors de la création de la formation [besoinId={}] : {}",
                    evt.getIdBesoinFormation(), ex.getMessage());
        } catch (Exception ex) {
            log.error("Erreur inattendue lors de la sauvegarde de la formation [besoinId={}] : {}",
                    evt.getIdBesoinFormation(), ex.getMessage(), ex);
        }
    }
}
