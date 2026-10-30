package esprit.pfe.serviceformation.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Active le traitement asynchrone et expose un pool dédié à l'envoi en masse
 * des invitations calendrier (.ics). Les dimensions du pool sont externalisées
 * via {@link CalendarProperties} (DSI §1.1 — aucune valeur en dur).
 */
@Configuration
@EnableAsync
@RequiredArgsConstructor
public class AsyncConfig {

    public static final String CALENDAR_MAIL_EXECUTOR = "calendarMailExecutor";

    /**
     * Appels Microsoft 365 (calendriers Outlook, e-mails de formation) exécutés après
     * validation de la transaction. Un seul fil : deux modifications rapprochées d'une
     * même formation sont appliquées dans l'ordre (pas d'événement créé en double).
     */
    public static final String OUTLOOK_SYNC_EXECUTOR = "outlookSyncExecutor";

    @Bean(name = OUTLOOK_SYNC_EXECUTOR)
    public Executor outlookSyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("outlook-sync-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }

    private final CalendarProperties calendarProperties;

    @Bean(name = CALENDAR_MAIL_EXECUTOR)
    public Executor calendarMailExecutor() {
        CalendarProperties.AsyncSettings cfg = calendarProperties.getMail().getAsync();
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(cfg.getCorePoolSize());
        executor.setMaxPoolSize(cfg.getMaxPoolSize());
        executor.setQueueCapacity(cfg.getQueueCapacity());
        executor.setThreadNamePrefix("cal-mail-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
