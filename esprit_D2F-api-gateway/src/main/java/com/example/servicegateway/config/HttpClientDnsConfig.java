package com.example.servicegateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.config.HttpClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Plafonne le cache DNS du client HTTP du gateway (Reactor Netty).
 *
 * <p>Le DNS embarqué de Docker répond avec un TTL de 600 s et Reactor Netty le
 * respecte : après la recréation d'un conteneur (nouvelle adresse IP), le
 * gateway continuait d'appeler l'ANCIENNE adresse jusqu'à 10 minutes. Constaté
 * le 2026-09-24 : service prédictif redémarré à 03:28:58, 503 en boucle de
 * 03:31 à 03:36 (connexion refusée, circuit ouvert, sondes half-open toutes en
 * échec), retour spontané à 03:36:42 à l'expiration de l'entrée DNS.</p>
 *
 * <p>Avec un plafond court, la nouvelle adresse est reprise en quelques
 * secondes. Le coût est une résolution DNS locale (127.0.0.11) toutes les
 * {@code gateway.httpclient.dns-cache-max-ttl} au plus.</p>
 */
@Configuration
public class HttpClientDnsConfig {

    @Bean
    public HttpClientCustomizer dnsCacheTtlCustomizer(
            @Value("${gateway.httpclient.dns-cache-max-ttl:10s}") Duration maxTtl) {
        return httpClient -> httpClient.resolver(spec -> spec
                .cacheMaxTimeToLive(maxTtl)
                // Un échec de résolution (conteneur en cours de recréation) ne
                // doit pas être mémorisé : on réessaie au prochain appel.
                .cacheNegativeTimeToLive(Duration.ZERO));
    }
}
