package esprit.pfe.serviceformation.messaging;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.PeriodCode;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.repositories.UpRepository;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class BesoinFormationEventListener {
    private static final String QUEUE = "BesoinFormationApprovedQueue";

    private final UpRepository upRepo;
    private final DeptRepository deptRepo;

    public BesoinFormationEventListener(UpRepository upRepo, DeptRepository deptRepo) {
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
        
        // Note: Missing formationRepository.save(f) - adding it would require the field back.
        // But the task was specifically to remove the unused field.
    }
}
