package tn.esprit.d2f.competence.config;

import org.mapstruct.factory.Mappers;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tn.esprit.d2f.competence.service.CompetenceMapper;

/**
 * Configuration pour fournir explicitement le bean MapStruct.
 * Utilisée pour résoudre les problèmes d'injection du mapper.
 */
@Configuration
public class MapperConfig {

    /**
     * Fournit le bean CompetenceMapper en utilisant MapStruct.
     * Cette approche garantit que le mapper est disponible pour l'injection de dépendances.
     */
    @Bean
    public CompetenceMapper competenceMapper() {
        return Mappers.getMapper(CompetenceMapper.class);
    }
}
