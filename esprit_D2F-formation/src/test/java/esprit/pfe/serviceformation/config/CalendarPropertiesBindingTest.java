package esprit.pfe.serviceformation.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CalendarProperties - liaison de configuration")
class CalendarPropertiesBindingTest {

    @Test
    @DisplayName("Les clés calendar.* (dont calendar.import.* imbriqué) se lient correctement")
    void bindsNestedImportAndMailKeys() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("calendar.timezone", "Africa/Tunis");
        env.setProperty("calendar.organizer-email", "org@esprit.tn");
        env.setProperty("calendar.import.max-file-size-bytes", "5242880");
        env.setProperty("calendar.import.header-keywords.trainer", "animateur,formateur,coach");
        env.setProperty("calendar.mail.from", "noreply@esprit.tn");
        env.setProperty("calendar.mail.async.max-pool-size", "8");

        Binder binder = new Binder(ConfigurationPropertySources.get(env));
        CalendarProperties props = binder.bind("calendar", CalendarProperties.class).get();

        assertThat(props.getTimezone()).isEqualTo("Africa/Tunis");
        assertThat(props.getOrganizerEmail()).isEqualTo("org@esprit.tn");
        assertThat(props.getImport().getMaxFileSizeBytes()).isEqualTo(5_242_880L);
        assertThat(props.getImport().getHeaderKeywords().getTrainer())
                .containsExactly("animateur", "formateur", "coach");
        assertThat(props.getMail().getFrom()).isEqualTo("noreply@esprit.tn");
        assertThat(props.getMail().getAsync().getMaxPoolSize()).isEqualTo(8);
    }
}
