package esprit.pfe.serviceformation.utils;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests complets pour ValidationUtils
 * Couverture: 100%
 */
@DisplayName("Tests pour ValidationUtils")
class ValidationUtilsTest {

    private ValidationUtils validationUtils;

    @BeforeEach
    void setUp() {
        validationUtils = new ValidationUtils();
    }

    // Tests pour notNull()
    @Test
    @DisplayName("notNull() - Ne lance pas d'exception quand l'objet n'est pas null")
    void testNotNull_WithNonNullObject_ShouldNotThrow() {
        assertDoesNotThrow(() -> validationUtils.notNull("test", "fieldName"));
        assertDoesNotThrow(() -> validationUtils.notNull(123, "fieldName"));
        assertDoesNotThrow(() -> validationUtils.notNull(new Object(), "fieldName"));
    }

    @Test
    @DisplayName("notNull() - Lance IllegalArgumentException quand l'objet est null")
    void testNotNull_WithNullObject_ShouldThrow() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.notNull(null, "fieldName")
        );
        assertEquals("fieldName ne peut pas être null", exception.getMessage());
    }

    // Tests pour notEmpty()
    @Test
    @DisplayName("notEmpty() - Ne lance pas d'exception quand la collection n'est pas vide")
    void testNotEmpty_WithNonEmptyCollection_ShouldNotThrow() {
        List<String> list = Arrays.asList("item1", "item2");
        Set<Integer> set = new HashSet<>(Arrays.asList(1, 2, 3));

        assertDoesNotThrow(() -> validationUtils.notEmpty(list, "fieldName"));
        assertDoesNotThrow(() -> validationUtils.notEmpty(set, "fieldName"));
    }

    @Test
    @DisplayName("notEmpty() - Lance IllegalArgumentException quand la collection est null")
    void testNotEmpty_WithNullCollection_ShouldThrow() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.notEmpty(null, "fieldName")
        );
        assertEquals("fieldName ne peut pas être vide", exception.getMessage());
    }

    @Test
    @DisplayName("notEmpty() - Lance IllegalArgumentException quand la collection est vide")
    void testNotEmpty_WithEmptyCollection_ShouldThrow() {
        List<String> emptyList = new ArrayList<>();
        Set<Integer> emptySet = new HashSet<>();

        IllegalArgumentException exception1 = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.notEmpty(emptyList, "fieldName")
        );
        assertEquals("fieldName ne peut pas être vide", exception1.getMessage());

        IllegalArgumentException exception2 = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.notEmpty(emptySet, "fieldName")
        );
        assertEquals("fieldName ne peut pas être vide", exception2.getMessage());
    }

    // Tests pour notBlank()
    @Test
    @DisplayName("notBlank() - Ne lance pas d'exception quand la chaîne n'est pas vide")
    void testNotBlank_WithNonBlankString_ShouldNotThrow() {
        assertDoesNotThrow(() -> validationUtils.notBlank("test", "fieldName"));
        assertDoesNotThrow(() -> validationUtils.notBlank("  test  ", "fieldName"));
        assertDoesNotThrow(() -> validationUtils.notBlank("a", "fieldName"));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   "})
    @DisplayName("notBlank() - Lance IllegalArgumentException quand la chaîne est null, vide ou espaces")
    void testNotBlank_WithInvalidString_ShouldThrow(String input) {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.notBlank(input, "fieldName")
        );
        assertEquals("fieldName ne peut pas être vide", exception.getMessage());
    }

    // Tests pour validId()
    @Test
    @DisplayName("validId() - Ne lance pas d'exception quand l'ID est positif")
    void testValidId_WithPositiveId_ShouldNotThrow() {
        assertDoesNotThrow(() -> validationUtils.validId(1L, "fieldName"));
        assertDoesNotThrow(() -> validationUtils.validId(100L, "fieldName"));
        assertDoesNotThrow(() -> validationUtils.validId(Long.MAX_VALUE, "fieldName"));
    }

    @Test
    @DisplayName("validId() - Lance IllegalArgumentException quand l'ID est null")
    void testValidId_WithNullId_ShouldThrow() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.validId(null, "fieldName")
        );
        assertEquals("fieldName doit être un entier positif, reçu: null", exception.getMessage());
    }

    @Test
    @DisplayName("validId() - Lance IllegalArgumentException quand l'ID est zéro")
    void testValidId_WithZeroId_ShouldThrow() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.validId(0L, "fieldName")
        );
        assertEquals("fieldName doit être un entier positif, reçu: 0", exception.getMessage());
    }

    @Test
    @DisplayName("validId() - Lance IllegalArgumentException quand l'ID est négatif")
    void testValidId_WithNegativeId_ShouldThrow() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.validId(-1L, "fieldName")
        );
        assertEquals("fieldName doit être un entier positif, reçu: -1", exception.getMessage());
    }

    // Tests pour dateRange()
    @Test
    @DisplayName("dateRange() - Ne lance pas d'exception quand la date de fin est après la date de début")
    void testDateRange_WithValidRange_ShouldNotThrow() {
        Calendar cal = Calendar.getInstance();
        Date debut = cal.getTime();
        cal.add(Calendar.DAY_OF_MONTH, 1);
        Date fin = cal.getTime();

        assertDoesNotThrow(() -> validationUtils.dateRange(debut, fin));
    }

    @Test
    @DisplayName("dateRange() - Lance IllegalArgumentException quand la date de début est null")
    void testDateRange_WithNullStartDate_ShouldThrow() {
        Date startDate = null;
        Date endDate = new Date();
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.dateRange(startDate, endDate)
        );
        assertEquals("Date de début ne peut pas être null", exception.getMessage());
    }

    @Test
    @DisplayName("dateRange() - Lance IllegalArgumentException quand la date de fin est null")
    void testDateRange_WithNullEndDate_ShouldThrow() {
        Date startDate = new Date();
        Date endDate = null;
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.dateRange(startDate, endDate)
        );
        assertEquals("Date de fin ne peut pas être null", exception.getMessage());
    }

    @Test
    @DisplayName("dateRange() - Lance IllegalArgumentException quand la date de fin est avant la date de début")
    void testDateRange_WithEndDateBeforeStartDate_ShouldThrow() {
        Calendar cal = Calendar.getInstance();
        Date fin = cal.getTime();
        cal.add(Calendar.DAY_OF_MONTH, 1);
        Date debut = cal.getTime();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.dateRange(debut, fin)
        );
        assertEquals("La date de fin doit être après la date de début", exception.getMessage());
    }

    @Test
    @DisplayName("dateRange() - Lance IllegalArgumentException quand les dates sont identiques")
    void testDateRange_WithSameDates_ShouldThrow() {
        Date sameDate = new Date();
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.dateRange(sameDate, sameDate)
        );
        assertEquals("La date de fin doit être après la date de début", exception.getMessage());
    }

    // Tests pour timeRange()
    @Test
    @DisplayName("timeRange() - Ne lance pas d'exception quand l'heure de fin est après l'heure de début")
    void testTimeRange_WithValidRange_ShouldNotThrow() {
        java.sql.Time debut = java.sql.Time.valueOf("09:00:00");
        java.sql.Time fin = java.sql.Time.valueOf("10:00:00");

        assertDoesNotThrow(() -> validationUtils.timeRange(debut, fin));
    }

    @Test
    @DisplayName("timeRange() - Lance IllegalArgumentException quand l'heure de début est null")
    void testTimeRange_WithNullStartTime_ShouldThrow() {
        java.sql.Time startTime = null;
        java.sql.Time endTime = java.sql.Time.valueOf("10:00:00");
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.timeRange(startTime, endTime)
        );
        assertEquals("Heure de début ne peut pas être null", exception.getMessage());
    }

    @Test
    @DisplayName("timeRange() - Lance IllegalArgumentException quand l'heure de fin est null")
    void testTimeRange_WithNullEndTime_ShouldThrow() {
        java.sql.Time startTime = java.sql.Time.valueOf("09:00:00");
        java.sql.Time endTime = null;
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.timeRange(startTime, endTime)
        );
        assertEquals("Heure de fin ne peut pas être null", exception.getMessage());
    }

    @Test
    @DisplayName("timeRange() - Lance IllegalArgumentException quand l'heure de fin est avant l'heure de début")
    void testTimeRange_WithEndTimeBeforeStartTime_ShouldThrow() {
        java.sql.Time debut = java.sql.Time.valueOf("10:00:00");
        java.sql.Time fin = java.sql.Time.valueOf("09:00:00");

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.timeRange(debut, fin)
        );
        assertEquals("L'heure de fin doit être après l'heure de début", exception.getMessage());
    }

    @Test
    @DisplayName("timeRange() - Lance IllegalArgumentException quand les heures sont identiques")
    void testTimeRange_WithSameTimes_ShouldThrow() {
        java.sql.Time sameTime = java.sql.Time.valueOf("09:00:00");
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> validationUtils.timeRange(sameTime, sameTime)
        );
        assertEquals("L'heure de fin doit être après l'heure de début", exception.getMessage());
    }
}
