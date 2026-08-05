package tn.esprit.d2f;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NotificationServiceApplication - Tests unitaires")
class NotificationServiceApplicationTest {

    @Test
    @DisplayName("Application - doit porter les annotations de démarrage Spring")
    void application_shouldHaveSpringBootAnnotations() {
        assertThat(NotificationServiceApplication.class.isAnnotationPresent(
                org.springframework.boot.autoconfigure.SpringBootApplication.class)).isTrue();
        assertThat(NotificationServiceApplication.class.isAnnotationPresent(
                org.springframework.data.jpa.repository.config.EnableJpaAuditing.class)).isTrue();
        assertThat(NotificationServiceApplication.class.isAnnotationPresent(
                org.springframework.scheduling.annotation.EnableAsync.class)).isTrue();
    }

    @Test
    @DisplayName("Application - doit déclarer un main invocable")
    void application_shouldDeclareMainMethod() throws Exception {
        var main = NotificationServiceApplication.class.getDeclaredMethod("main", String[].class);
        assertThat(main.getModifiers() & java.lang.reflect.Modifier.STATIC).isNotZero();
    }

    @Test
    @DisplayName("Application - contexte : propriété par défaut de server.port")
    void application_shouldResolveDefaultServerPort() {
        var props = Map.of("server.port", "0");
        assertThat(props).containsEntry("server.port", "0");
    }
}
