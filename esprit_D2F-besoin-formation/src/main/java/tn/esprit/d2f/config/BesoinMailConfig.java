package tn.esprit.d2f.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * DSI §: pool d'envoi asynchrone des e-mails de notification du D2F — parité
 * avec le service formation ({@code AsyncConfig.CALENDAR_MAIL_EXECUTOR} /
 * {@code calendar.mail.async.*}). L'envoi SMTP (timeouts 5 s) ne doit jamais
 * ralentir ni bloquer la requête métier d'ajout / modification d'un besoin.
 */
@Configuration
@EnableAsync
public class BesoinMailConfig {

    public static final String BESOIN_MAIL_EXECUTOR = "besoinMailExecutor";

    @Bean(name = BESOIN_MAIL_EXECUTOR)
    public ThreadPoolTaskExecutor besoinMailExecutor(
            @org.springframework.beans.factory.annotation.Value("${besoin.mail.async.core-pool-size:1}") int corePoolSize,
            @org.springframework.beans.factory.annotation.Value("${besoin.mail.async.max-pool-size:3}") int maxPoolSize,
            @org.springframework.beans.factory.annotation.Value("${besoin.mail.async.queue-capacity:100}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("besoin-mail-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return executor;
    }
}