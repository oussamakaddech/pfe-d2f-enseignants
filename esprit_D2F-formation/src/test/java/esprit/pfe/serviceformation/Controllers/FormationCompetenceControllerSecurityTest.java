package esprit.pfe.serviceformation.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Blocker DSI #4 : FormationCompetenceController exposait 7 endpoints CRUD sans
 * aucune autorisation. Ce test garantit que CHAQUE méthode handler porte un
 * {@link PreAuthorize} — un nouvel endpoint non sécurisé fera échouer la build.
 */
class FormationCompetenceControllerSecurityTest {

    @Test
    void everyEndpoint_isProtectedByPreAuthorize() {
        List<String> unprotected = new ArrayList<>();
        for (Method method : FormationCompetenceController.class.getDeclaredMethods()) {
            if (!isHttpHandler(method)) {
                continue;
            }
            if (method.getAnnotation(PreAuthorize.class) == null) {
                unprotected.add(method.getName());
            }
        }
        assertTrue(unprotected.isEmpty(),
                "Endpoints sans @PreAuthorize (faille RBAC) : " + unprotected);
    }

    /** Un handler HTTP est annoté par un dérivé de @RequestMapping (GET/POST/PUT/DELETE/PATCH). */
    private boolean isHttpHandler(Method method) {
        for (Annotation annotation : method.getAnnotations()) {
            Class<? extends Annotation> type = annotation.annotationType();
            if (type.isAnnotationPresent(RequestMapping.class) || type.equals(RequestMapping.class)) {
                return true;
            }
        }
        return false;
    }
}
