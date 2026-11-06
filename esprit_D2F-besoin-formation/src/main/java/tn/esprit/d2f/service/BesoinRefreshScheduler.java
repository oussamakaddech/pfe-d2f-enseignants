package tn.esprit.d2f.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.repository.BesoinFormationRepository;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class BesoinRefreshScheduler {

    private final BesoinFormationRepository repository;
    private final IBesoinFormationService besoinFormationService;

    /**
     * Rafraîchit les besoins de formation toutes les 2 heures.
     */
    @Scheduled(cron = "0 0 */2 * * *")
    public void refreshBesoins() {
        log.info("Mise à jour périodique des besoins (toutes les 2h)");
        List<BesoinFormation> besoins = repository.findAll();
        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
        
        for (BesoinFormation b : besoins) {
            b.setLastRefreshDate(now);
            repository.save(b);
        }
        log.info("{} besoins rafraîchis.", besoins.size());
    }

    /**
     * Republication différée (§7) : les besoins ADMIN_APPROVED dont l'événement
     * RabbitMQ n'est pas parti (broker indisponible au clic admin) sont
     * republiés jusqu'à succès. Idempotent via le flag eventPublished.
     */
    @Scheduled(cron = "0 */30 * * * *")
    public void republishPendingApprovalEvents() {
        try {
            int republished = besoinFormationService.republishPendingEvents();
            if (republished > 0) {
                log.info("Événements d'approbation republiés : {}", republished);
            }
        } catch (Exception e) {
            log.error("Échec republication différée des événements : {}", e.getMessage());
        }
    }
}
