package esprit.pfe.serviceformation.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Cache Configuration for Formation Service
 * 
 * Provides Caffeine-based caching with configurable TTL for:
 * - KPI data (5 minutes TTL)
 * - Formation statistics (5 minutes TTL)
 * - Teacher data (10 minutes TTL)
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String KPI_TAUX_PARTICIPATION = "kpi-taux-participation";
    public static final String KPI_FORMATIONS_PAR_ETAT = "kpi-formations-par-etat";
    public static final String KPI_FORMATIONS_PAR_TYPE = "kpi-formations-par-type";
    public static final String FORMATION_STATS = "formation-stats";
    public static final String ENSEIGNANT_DATA = "enseignant-data";
    
    private static final int DEFAULT_TTL_MINUTES = 5;
    private static final int MAX_CACHE_SIZE = 1000;

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                KPI_TAUX_PARTICIPATION,
                KPI_FORMATIONS_PAR_ETAT,
                KPI_FORMATIONS_PAR_TYPE,
                FORMATION_STATS,
                ENSEIGNANT_DATA
        );
        
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(DEFAULT_TTL_MINUTES, TimeUnit.MINUTES)
                .maximumSize(MAX_CACHE_SIZE)
                .recordStats());
        
        return cacheManager;
    }
    
    @Bean
    public Caffeine<Object, Object> caffeineConfig() {
        return Caffeine.newBuilder()
                .expireAfterWrite(DEFAULT_TTL_MINUTES, TimeUnit.MINUTES)
                .maximumSize(MAX_CACHE_SIZE)
                .recordStats();
    }
}