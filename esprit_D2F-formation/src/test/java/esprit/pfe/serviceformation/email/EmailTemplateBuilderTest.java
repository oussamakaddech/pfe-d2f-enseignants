package esprit.pfe.serviceformation.email;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailTemplateBuilderTest {

    @Test
    @DisplayName("build() — un template minimal produit un document HTML complet")
    void shouldProduceFullHtmlDocument() {
        String html = EmailTemplateBuilder.create()
                .title("Test")
                .intro("Hello world")
                .build();

        assertNotNull(html);
        assertAll(
            () -> assertTrue(html.startsWith("<!DOCTYPE html><html>"), "DOCTYPE manquant"),
            () -> assertTrue(html.contains("</html>"), "Balise fermante </html> manquante"),
            () -> assertTrue(html.contains("<meta charset=\"utf-8\">"), "Charset utf-8 manquant"),
            () -> assertTrue(html.contains("Test"), "Titre manquant"),
            () -> assertTrue(html.contains("Hello world"), "Intro manquante"),
            () -> assertTrue(html.contains("Bonjour,"), "Greeting par défaut manquant"),
            () -> assertTrue(html.contains("Esprit — Direction du Développement et de la Formation"), "Branding pied manquant"),
            () -> assertTrue(html.contains("ne pas y répondre"), "Mention no-reply manquante")
        );
    }

    @Test
    @DisplayName("build() — la salutation utilise greetingName si fourni, sinon 'Bonjour,' par défaut")
    void shouldCustomizeGreeting() {
        String withName = EmailTemplateBuilder.create()
                .title("t")
                .greetingName("Sami Trabelsi")
                .build();
        String withoutName = EmailTemplateBuilder.create().title("t").build();

        assertTrue(withName.contains("Bonjour Sami Trabelsi,"), "Salutation personnalisée absente");
        assertTrue(withoutName.contains("Bonjour,"), "Salutation par défaut absente");
        assertFalse(withoutName.contains("Bonjour ,"), "Salutation par défaut ne doit pas contenir d'espace avant la virgule");
    }

    @Test
    @DisplayName("build() — la couleur d'accent est appliquée à l'en-tête, aux bordures et au titre de section")
    void shouldApplyAccentColor() {
        String html = EmailTemplateBuilder.create()
                .accentColor("#bada55")
                .title("Color test")
                .intro("intro")
                .detail("label1", "value1")
                .build();

        assertTrue(html.contains("background:#bada55"), "Couleur d'accent absente du header");
        assertTrue(html.contains("border-left:4px solid #bada55"), "Couleur d'accent absente de la bordure intro");
        assertTrue(html.contains("color:#bada55"), "Couleur d'accent absente du label détail");
    }

    @Test
    @DisplayName("build() — les sections détails, séances et note sont conditionnelles")
    void shouldRenderOptionalSectionsConditionally() {
        String minimal = EmailTemplateBuilder.create().title("t").build();
        String withDetails = EmailTemplateBuilder.create().title("t").detail("Label", "Value").build();
        String withSeances = EmailTemplateBuilder.create().title("t").seance("12/06/2026 · 09:00–12:00 · Salle B12").build();
        String withNote = EmailTemplateBuilder.create().title("t").note("Action requise").build();

        assertAll(
            () -> assertFalse(minimal.contains("Informations de la formation"), "Section détails affichée à tort"),
            () -> assertTrue(withDetails.contains("Informations de la formation"), "Section détails manquante"),
            () -> assertTrue(withDetails.contains("Label"), "Label détail manquant"),
            () -> assertTrue(withDetails.contains("Value"), "Valeur détail manquante"),

            () -> assertFalse(minimal.contains("Calendrier des séances"), "Section séances affichée à tort"),
            () -> assertTrue(withSeances.contains("Calendrier des séances"), "Section séances manquante"),
            () -> assertTrue(withSeances.contains("Salle B12"), "Ligne séance absente"),

            () -> assertFalse(minimal.contains("Action requise"), "Note affichée à tort"),
            () -> assertTrue(withNote.contains("Action requise"), "Note manquante")
        );
    }

    @Test
    @DisplayName("build() — les valeurs nulles ou blanches sont remplacées par '—' (placeholder)")
    void shouldSubstituteNullOrBlankWithDash() {
        String html = EmailTemplateBuilder.create()
                .title("t")
                .detail("Label", null)
                .detail("Other", "   ")
                .build();

        assertTrue(html.contains("—"), "Placeholder '—' attendu pour valeurs nulles/vides");
        assertFalse(html.contains("Label</td>\n      <td>Label"), "Pas de duplication attendue");
    }

    @Test
    @DisplayName("build() — l'icône est affichée en haut à gauche du bandeau coloré")
    void shouldRenderIcon() {
        String html = EmailTemplateBuilder.create()
                .icon("✅")
                .title("Title")
                .build();

        assertTrue(html.contains("✅"), "Icône absente");
        assertTrue(html.contains("font-size:42px"), "Taille icône (42px) non appliquée");
    }

    @Test
    @DisplayName("build() — l'année du copyright est dynamique (= année courante)")
    void shouldUseCurrentYearInFooter() {
        int currentYear = LocalDate.now().getYear();
        String html = EmailTemplateBuilder.create().title("t").build();
        assertTrue(html.contains("© " + currentYear + " — Tous droits réservés"),
                "Copyright devrait afficher l'année courante " + currentYear);
    }

    @Test
    @DisplayName("build() — les balises et caractères HTML des valeurs sont échappés (sécurité XSS)")
    void shouldEscapeHtmlInValues() {
        String html = EmailTemplateBuilder.create()
                .title("t")
                .greetingName("<script>alert('xss')</script>")
                .detail("Label", "<b>bold</b> & \"quote\"")
                .build();

        assertFalse(html.contains("<script>alert"), "XSS: <script> non échappé dans greetingName");
        assertTrue(html.contains("&lt;script&gt;"), "XSS: <script> devrait être échappé en &lt;script&gt;");
        assertTrue(html.contains("&lt;b&gt;bold&lt;/b&gt;"), "Détail: balises non échappées");
        assertTrue(html.contains("&amp;"), "Ampersand non échappé");
        assertTrue(html.contains("&quot;"), "Quote non échappée");
    }

    @Test
    @DisplayName("build() — un titre blank ou null retombe sur le placeholder 'Notification'")
    void shouldFallBackToDefaultTitle() {
        String withNull = EmailTemplateBuilder.create().title(null).build();
        String withBlank = EmailTemplateBuilder.create().title("   ").build();
        assertTrue(withNull.contains("Notification"), "Titre par défaut attendu pour null");
        assertTrue(withBlank.contains("Notification"), "Titre par défaut attendu pour blank");
    }

    @Test
    @DisplayName("build() — Fluent API : chaînage sans valeur de retour (utilisation typique)")
    void shouldSupportFluentChaining() {
        // Vérifie que toutes les méthodes retournent `this` (fluent)
        EmailTemplateBuilder builder = EmailTemplateBuilder.create();
        assertEquals(builder, builder.accentColor("#fff"), "accentColor doit retourner this");
        assertEquals(builder, builder.icon("x"), "icon doit retourner this");
        assertEquals(builder, builder.title("t"), "title doit retourner this");
        assertEquals(builder, builder.greetingName("n"), "greetingName doit retourner this");
        assertEquals(builder, builder.intro("i"), "intro doit retourner this");
        assertEquals(builder, builder.detail("l", "v"), "detail doit retourner this");
        assertEquals(builder, builder.seance("s"), "seance doit retourner this");
        assertEquals(builder, builder.note("n"), "note doit retourner this");
    }

    @Test
    @DisplayName("build() — seance() avec null ou blank n'ajoute rien")
    void shouldIgnoreBlankSeance() {
        String html = EmailTemplateBuilder.create()
                .title("t")
                .seance(null)
                .seance("   ")
                .seance("valide")
                .build();

        assertTrue(html.contains("valide"), "Séance valide attendue");
        assertFalse(html.contains("null"), "Séance null ne doit pas être stringifiée");
    }
}
