package esprit.pfe.serviceformation.utils;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.time.Month;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class CalendarParsingUtilsTest {

    @ParameterizedTest
    @ValueSource(strings = {"test@esprit.tn", "a.b@c.df", "user+tag@domain.co.uk"})
    void isValidEmail_valid(String email) {
        assertThat(CalendarParsingUtils.isValidEmail(email)).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"not-an-email", "@domain", "user@", "user@.com"})
    void isValidEmail_invalid(String email) {
        assertThat(CalendarParsingUtils.isValidEmail(email)).isFalse();
    }

    @Test
    void parseDate_valid() {
        assertThat(CalendarParsingUtils.parseDate("10/06/2026")).contains(LocalDate.of(2026, Month.JUNE, 10));
        assertThat(CalendarParsingUtils.parseDate("10/6/2026")).contains(LocalDate.of(2026, Month.JUNE, 10));
        assertThat(CalendarParsingUtils.parseDate("10-06-2026")).contains(LocalDate.of(2026, Month.JUNE, 10));
        assertThat(CalendarParsingUtils.parseDate("2026-06-10")).contains(LocalDate.of(2026, Month.JUNE, 10));
        assertThat(CalendarParsingUtils.parseDate("10.6.2026")).contains(LocalDate.of(2026, Month.JUNE, 10));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"invalid", "32/13/2026", "not-a-date"})
    void parseDate_invalid(String value) {
        assertThat(CalendarParsingUtils.parseDate(value)).isEmpty();
    }

    @Test
    void parseFlexibleDate_strictMatch() {
        Optional<LocalDate> result = CalendarParsingUtils.parseFlexibleDate("10/06/2026", 2025);
        assertThat(result).contains(LocalDate.of(2026, Month.JUNE, 10));
    }

    @Test
    void parseFlexibleDate_dayMonthOnly() {
        Optional<LocalDate> result = CalendarParsingUtils.parseFlexibleDate("30/06", 2025);
        assertThat(result).contains(LocalDate.of(2025, Month.JUNE, 30));
    }

    @Test
    void parseFlexibleDate_withDayNamePrefix() {
        Optional<LocalDate> result = CalendarParsingUtils.parseFlexibleDate("Lundi 30/06/2025", 2025);
        assertThat(result).contains(LocalDate.of(2025, Month.JUNE, 30));
    }

    @Test
    void parseFlexibleDate_twoDigitYear() {
        Optional<LocalDate> result = CalendarParsingUtils.parseFlexibleDate("30/06/25", 2025);
        assertThat(result).contains(LocalDate.of(2025, Month.JUNE, 30));
    }

    @Test
    void parseFlexibleDate_dotSeparator() {
        Optional<LocalDate> result = CalendarParsingUtils.parseFlexibleDate("30.06.2025", 2025);
        assertThat(result).contains(LocalDate.of(2025, Month.JUNE, 30));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"not-a-date", "abcdef"})
    void parseFlexibleDate_invalid(String value) {
        assertThat(CalendarParsingUtils.parseFlexibleDate(value, 2025)).isEmpty();
    }

    @Test
    void parseTime_valid() {
        assertThat(CalendarParsingUtils.parseTime("09:00")).contains(LocalTime.of(9, 0));
        assertThat(CalendarParsingUtils.parseTime("9h")).contains(LocalTime.of(9, 0));
        assertThat(CalendarParsingUtils.parseTime("09h30")).contains(LocalTime.of(9, 30));
        assertThat(CalendarParsingUtils.parseTime("14:30")).contains(LocalTime.of(14, 30));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"abc", "25:00", "9:61"})
    void parseTime_invalid(String value) {
        assertThat(CalendarParsingUtils.parseTime(value)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "09:00-12:00, 09:00, 12:00",
            "09:00 \u00e0 12:00, 09:00, 12:00",
            "9h - 12h30, 09:00, 12:30"
    })
    void parseTimeSlot_valid(String input, String start, String end) {
        Optional<LocalTime[]> result = CalendarParsingUtils.parseTimeSlot(input);
        assertThat(result).isPresent();
        assertThat(result.get()[0]).isEqualTo(LocalTime.parse(start));
        assertThat(result.get()[1]).isEqualTo(LocalTime.parse(end));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"invalid", "09:00", "abc-def"})
    void parseTimeSlot_invalid(String value) {
        assertThat(CalendarParsingUtils.parseTimeSlot(value)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "Séance 1/3, 1, 3",
            "1/3, 1, 3",
            "Session 2/5, 2, 5"
    })
    void parseSession_valid(String input, int num, int total) {
        Optional<int[]> result = CalendarParsingUtils.parseSession(input);
        assertThat(result).isPresent();
        assertThat(result.get()[0]).isEqualTo(num);
        assertThat(result.get()[1]).isEqualTo(total);
    }

    @Test
    void parseSession_withSeancePrefix() {
        Optional<int[]> result = CalendarParsingUtils.parseSession("Seance 2/5");
        assertThat(result).isPresent();
        assertThat(result.get()[0]).isEqualTo(2);
        assertThat(result.get()[1]).isEqualTo(5);
    }

    @Test
    void parseSession_numberExceedsTotal() {
        assertThat(CalendarParsingUtils.parseSession("4/3")).isEmpty();
    }

    @Test
    void parseSession_zeroNumber() {
        assertThat(CalendarParsingUtils.parseSession("0/3")).isEmpty();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"invalid", "abc/def", "1/", "1/0"})
    void parseSession_invalid(String value) {
        assertThat(CalendarParsingUtils.parseSession(value)).isEmpty();
    }
}
