package tn.esprit.d2f.competence.entity.enumerations;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;
import java.util.Map;

/**
 * Normalise les valeurs historiques de niveau (ex. CONFIRME, INITIE, DEBUTANT,
 * NIVEAU_1..5, "1".."5") vers l'enum canonique N1_DEBUTANT..N5_EXPERT.
 * Même correspondance que l'ancien service d'analyse (parseNiveau).
 */
@Converter
public class NiveauMaitriseConverter implements AttributeConverter<NiveauMaitrise, String> {

    private static final Map<String, NiveauMaitrise> LEGACY_MAP = Map.ofEntries(
            Map.entry("DEBUTANT", NiveauMaitrise.N1_DEBUTANT),
            Map.entry("INITIE", NiveauMaitrise.N2_ELEMENTAIRE),
            Map.entry("CONFIRME", NiveauMaitrise.N3_INTERMEDIAIRE),
            Map.entry("AVANCE", NiveauMaitrise.N4_AVANCE),
            Map.entry("EXPERT", NiveauMaitrise.N5_EXPERT),
            Map.entry("NIVEAU_1", NiveauMaitrise.N1_DEBUTANT),
            Map.entry("NIVEAU_2", NiveauMaitrise.N2_ELEMENTAIRE),
            Map.entry("NIVEAU_3", NiveauMaitrise.N3_INTERMEDIAIRE),
            Map.entry("NIVEAU_4", NiveauMaitrise.N4_AVANCE),
            Map.entry("NIVEAU_5", NiveauMaitrise.N5_EXPERT),
            Map.entry("1", NiveauMaitrise.N1_DEBUTANT),
            Map.entry("2", NiveauMaitrise.N2_ELEMENTAIRE),
            Map.entry("3", NiveauMaitrise.N3_INTERMEDIAIRE),
            Map.entry("4", NiveauMaitrise.N4_AVANCE),
            Map.entry("5", NiveauMaitrise.N5_EXPERT));

    @Override
    public String convertToDatabaseColumn(NiveauMaitrise attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public NiveauMaitrise convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        String raw = dbData.trim().toUpperCase(Locale.ROOT);
        try {
            return NiveauMaitrise.valueOf(raw);
        } catch (IllegalArgumentException e) {
            return LEGACY_MAP.getOrDefault(raw, NiveauMaitrise.N2_ELEMENTAIRE);
        }
    }
}
