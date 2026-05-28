package esprit.pfe.serviceformation.messaging;

import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.PeriodCode;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.rabbitmq.client.Channel;

import java.io.IOException;
import java.util.Date;

/**
 * RabbitMQ Consumer for BesoinFormationApprovedEvent
 * 
 * SECURED FEATURES:
 * - Idempotency: Checks if Formation with idBesoinFormation already exists
 * - Validation: Validates event payload before processing
 * - Error handling: Wrapped in try/catch, bad messages go to DLQ
 * - Metrics: Tracks success/failure rates and processing time
 */
@Component
@Slf4j
public class BesoinFormationEventListener {
    
    private static final String QUEUE = "BesoinFormationApprovedQueue";
    private static final String TAG_SOURCE = "source";
    private static final String VAL_BESOIN_FORMATION = "besoin-formation";
    private static final String VAL_APPROVED = "approved";
    
    private final FormationRepository formationRepository;
    private final UpRepository upRepo;
    private final DeptRepository deptRepo;
    private final Counter eventReceivedCounter;
    private final Counter eventProcessedSuccessCounter;
    private final Counter eventProcessedFailureCounter;
    private final Timer eventProcessingTimer;
    
    public BesoinFormationEventListener(FormationRepository formationRepository,
                                        UpRepository upRepo,
                                        DeptRepository deptRepo,
                                        MeterRegistry meterRegistry) {
        this.formationRepository = formationRepository;
        this.upRepo = upRepo;
        this.deptRepo = deptRepo;
        
        // Initialize metrics
        this.eventReceivedCounter = Counter.builder("formation.event.received")
                .tag(TAG_SOURCE, VAL_BESOIN_FORMATION)
                .tag("type", VAL_APPROVED)
                .description("Number of approved besoin events received")
                .register(meterRegistry);
        
        this.eventProcessedSuccessCounter = Counter.builder("formation.event.processed")
                .tag(TAG_SOURCE, VAL_BESOIN_FORMATION)
                .tag("type", VAL_APPROVED)
                .tag("status", "success")
                .description("Number of events processed successfully")
                .register(meterRegistry);
        
        this.eventProcessedFailureCounter = Counter.builder("formation.event.processed")
                .tag(TAG_SOURCE, VAL_BESOIN_FORMATION)
                .tag("type", VAL_APPROVED)
                .tag("status", "failure")
                .description("Number of events processed with failure")
                .register(meterRegistry);
        
        this.eventProcessingTimer = Timer.builder("formation.event.processing.time")
                .tag(TAG_SOURCE, VAL_BESOIN_FORMATION)
                .description("Time taken to process each event")
                .register(meterRegistry);
    }
    
    @RabbitListener(queues = QUEUE, ackMode = "MANUAL")
    public void onBesoinApproved(BesoinFormationApprovedEvent evt,
                                  Channel channel,
                                  @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {
        
        log.info("Received BesoinFormationApprovedEvent [besoinId={}, username={}]", 
                evt.getIdBesoinFormation(), evt.getUsername());

        
        eventReceivedCounter.increment();
        
        Timer.Sample sample = Timer.start();
        
        try {
            // 1. Validate event payload
            validateEventPayload(evt);
            
            // 2. Check idempotency - prevent duplicate formations
            if (formationRepository.existsByIdBesoinFormation(evt.getIdBesoinFormation())) {
                log.warn("Formation already exists for besoinId={}, skipping (idempotent)", 
                        evt.getIdBesoinFormation());
                acknowledgeMessage(channel, deliveryTag);
                return;
            }
            
            // 3. Create and save formation
            Formation f = createFormationFromEvent(evt);
            Formation saved = formationRepository.save(f);
            
            log.info("Formation created successfully [id={}, besoinId={}, titre={}]",
                    saved.getIdFormation(), saved.getIdBesoinFormation(), saved.getTitreFormation());
            
            eventProcessedSuccessCounter.increment();
            acknowledgeMessage(channel, deliveryTag);
            
        } catch (IllegalArgumentException ex) {
            // Validation error - acknowledge but log warning (don't retry)
            log.warn("Invalid event payload [besoinId={}]: {}", evt.getIdBesoinFormation(), ex.getMessage());
            acknowledgeMessage(channel, deliveryTag);
            
        } catch (DataIntegrityViolationException ex) {
            // Duplicate key - already processed, acknowledge
            log.warn("Duplicate formation detected [besoinId={}]: {}", evt.getIdBesoinFormation(), ex.getMessage());
            acknowledgeMessage(channel, deliveryTag);
            
        } catch (Exception ex) {
            // Unexpected error - send to DLQ for investigation
            log.error("Error processing BesoinFormationApprovedEvent [besoinId={}]: {}",
                    evt.getIdBesoinFormation(), ex.getMessage(), ex);
            
            eventProcessedFailureCounter.increment();
            
            // Reject and don't requeue - will go to DLQ if configured
            rejectMessage(channel, deliveryTag, ex);
        } finally {
            sample.stop(eventProcessingTimer);
        }
    }
    
    /**
     * Validates the event payload before processing.
     * Throws IllegalArgumentException if validation fails.
     */
    private void validateEventPayload(BesoinFormationApprovedEvent evt) {
        if (evt == null) {
            throw new IllegalArgumentException("Event cannot be null");
        }
        if (evt.getIdBesoinFormation() == null) {
            throw new IllegalArgumentException("besoinId cannot be null");
        }
        if (evt.getIdBesoinFormation() <= 0) {
            throw new IllegalArgumentException("besoinId must be positive");
        }
        if (evt.getTypeBesoin() == null || evt.getTypeBesoin().isBlank()) {
            throw new IllegalArgumentException("typeBesoin cannot be blank");
        }
        // Title is required (from either titre or programmeFormation)
        if ((evt.getTitre() == null || evt.getTitre().isBlank()) 
                && (evt.getProgrammeFormation() == null || evt.getProgrammeFormation().isBlank())) {
            throw new IllegalArgumentException("Either titre or programmeFormation must be provided");
        }
    }
    
    /**
     * Creates a Formation entity from the event data.
     */
    private Formation createFormationFromEvent(BesoinFormationApprovedEvent evt) {
        Formation f = new Formation();
        
        // Set ID from besoin
        f.setIdBesoinFormation(evt.getIdBesoinFormation());
        
        // Set title (prefer titre, fallback to programmeFormation)
        String title = evt.getTitre() != null && !evt.getTitre().isBlank() 
                ? evt.getTitre() 
                : evt.getProgrammeFormation();
        f.setTitreFormation(title);
        
        // Map other fields
        f.setDomaine(evt.getTheme());
        f.setPopulationCible(evt.getPublicCible());
        f.setObjectifs(evt.getObjectifFormation());
        f.setObjectifsPedago(evt.getObjectifsPedagogiques());
        f.setEvalMethods(evt.getMethodesEvaluationAcquis());
        f.setPrerequis(evt.getPrerequis());
        f.setIndicateurs(evt.getMoyensPedagogiques());
        f.setChargeHoraireGlobal(evt.getDureeFormation());
        f.setTypeBesoin(evt.getTypeBesoin());
        
        // Set period code
        if (evt.getPeriodCode() != null && !evt.getPeriodCode().isBlank()) {
            try {
                f.setPeriodCode(PeriodCode.valueOf(evt.getPeriodCode()));
            } catch (Exception e) {
                f.setPeriodCode(PeriodCode.OTHER);
            }
        }
        f.setCustomPeriodLabel(evt.getCustomPeriodLabel());
        
        // Link UP and Department
        if (evt.getUp() != null && !evt.getUp().isBlank()) {
            upRepo.findById(evt.getUp()).ifPresent(f::setUp);
        }
        if (evt.getDepartement() != null && !evt.getDepartement().isBlank()) {
            deptRepo.findById(evt.getDepartement()).ifPresent(f::setDepartement);
        }
        
        // Set initial state
        f.setTypeFormation(TypeFormation.INTERNE);
        f.setEtatFormation(EtatFormation.NOUVEAU);
        f.setDateDebut(new Date());
        f.setDateFin(new Date());
        
        return f;
    }
    
    /**
     * Acknowledges the message (success).
     */
    private void acknowledgeMessage(Channel channel, long deliveryTag) {
        try {
            channel.basicAck(deliveryTag, false);
        } catch (IOException ex) {
            log.error("Failed to acknowledge message: {}", ex.getMessage());
        }
    }
    
    /**
     * Rejects the message and sends to DLQ (if configured).
     */
    private void rejectMessage(Channel channel, long deliveryTag, Exception ex) {
        try {
            // requeue=false means message goes to DLQ if configured
            channel.basicNack(deliveryTag, false, false);
        } catch (IOException ioEx) {
            log.error("Failed to reject message: {}", ioEx.getMessage());
            // If we can't reject, throw exception to trigger DLQ
            throw new AmqpRejectAndDontRequeueException("Failed to process message", ex);
        }
    }
}