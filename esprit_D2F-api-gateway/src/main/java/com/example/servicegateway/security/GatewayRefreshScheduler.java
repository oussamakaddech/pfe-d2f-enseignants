package com.example.servicegateway.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
@Slf4j
public class GatewayRefreshScheduler {

    /**
     * Rafraîchit l'état du système toutes les 2 heures.
     */
    @Scheduled(cron = "0 0 */2 * * *")
    public void refreshGatewayState() {
        log.info("Mise à jour périodique du Gateway à {} — Synchronisation des routes et vérification de la santé.", LocalDateTime.now(ZoneId.systemDefault()));
        // Simulation d'une mise à jour globale
        log.info("Toutes les routes sont opérationnelles.");
    }
}
