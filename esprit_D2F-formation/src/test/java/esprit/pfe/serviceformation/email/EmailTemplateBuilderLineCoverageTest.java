package esprit.pfe.serviceformation.email;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmailTemplateBuilderLineCoverageTest {

    @Test
    @DisplayName("create() returns a non-null builder")
    void createReturnsNonNull() {
        assertNotNull(EmailTemplateBuilder.create());
    }

    // ── accentColor ──────────────────────────────────────────────────────

    @Test
    @DisplayName("accentColor — null keeps default")
    void accentColorNullKeepsDefault() {
        String html = EmailTemplateBuilder.create().accentColor(null).title("t").build();
        assertTrue(html.contains("background:#1565c0"), "Default accent should remain");
    }

    @Test
    @DisplayName("accentColor — blank keeps default")
    void accentColorBlankKeepsDefault() {
        String html = EmailTemplateBuilder.create().accentColor("   ").title("t").build();
        assertTrue(html.contains("background:#1565c0"), "Default accent should remain for blank");
    }

    @Test
    @DisplayName("accentColor — valid color overrides default")
    void accentColorValidOverrides() {
        String html = EmailTemplateBuilder.create().accentColor("#ff0000").title("t").build();
        assertTrue(html.contains("background:#ff0000"), "Custom accent should appear");
    }

    // ── icon ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("icon — null becomes empty string")
    void iconNullBecomesEmpty() {
        String html = EmailTemplateBuilder.create().icon(null).title("t").build();
        assertFalse(html.contains("font-size:42px"), "No icon div should appear for null");
    }

    @Test
    @DisplayName("icon — valid icon is rendered")
    void iconValidRendered() {
        String html = EmailTemplateBuilder.create().icon("🚀").title("t").build();
        assertTrue(html.contains("🚀"), "Icon should appear");
        assertTrue(html.contains("font-size:42px"), "Icon font-size should be present");
    }

    @Test
    @DisplayName("icon — empty string shows no icon div")
    void iconEmptyString() {
        String html = EmailTemplateBuilder.create().icon("").title("t").build();
        assertFalse(html.contains("font-size:42px"), "No icon div for empty string");
    }

    // ── title ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("title — null keeps default 'Notification'")
    void titleNullKeepsDefault() {
        String html = EmailTemplateBuilder.create().title(null).build();
        assertTrue(html.contains("Notification"), "Default title should appear");
    }

    @Test
    @DisplayName("title — blank keeps default 'Notification'")
    void titleBlankKeepsDefault() {
        String html = EmailTemplateBuilder.create().title("   ").build();
        assertTrue(html.contains("Notification"), "Default title for blank");
    }

    @Test
    @DisplayName("title — valid value is rendered")
    void titleValidRendered() {
        String html = EmailTemplateBuilder.create().title("Mon Titre").build();
        assertTrue(html.contains("Mon Titre"), "Custom title should appear");
    }

    // ── greetingName ─────────────────────────────────────────────────────

    @Test
    @DisplayName("greetingName — null produces default 'Bonjour,'")
    void greetingNameNullDefault() {
        String html = EmailTemplateBuilder.create().greetingName(null).title("t").build();
        assertTrue(html.contains("Bonjour,"), "Default greeting");
        assertFalse(html.contains("Bonjour null,"), "null should not appear literally");
    }

    @Test
    @DisplayName("greetingName — blank produces default 'Bonjour,'")
    void greetingNameBlankDefault() {
        String html = EmailTemplateBuilder.create().greetingName("   ").title("t").build();
        assertTrue(html.contains("Bonjour,"), "Default greeting for blank");
    }

    @Test
    @DisplayName("greetingName — valid name is used")
    void greetingNameValid() {
        String html = EmailTemplateBuilder.create().greetingName("Alice").title("t").build();
        assertTrue(html.contains("Bonjour Alice,"), "Personalized greeting");
    }

    @Test
    @DisplayName("greetingName — name with leading/trailing spaces is trimmed")
    void greetingNameTrimmed() {
        String html = EmailTemplateBuilder.create().greetingName("  Bob  ").title("t").build();
        assertTrue(html.contains("Bonjour Bob,"), "Name should be trimmed");
    }

    // ── intro ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("intro — null produces no intro block")
    void introNullNoBlock() {
        String html = EmailTemplateBuilder.create().intro(null).title("t").build();
        assertFalse(html.contains("border-left:4px solid"), "No intro block for null");
    }

    @Test
    @DisplayName("intro — valid message is rendered inside colored border")
    void introValidRendered() {
        String html = EmailTemplateBuilder.create().intro("<strong>Hello</strong>").title("t").build();
        assertTrue(html.contains("border-left:4px solid"), "Intro block should be present");
        assertTrue(html.contains("<strong>Hello</strong>"), "Intro message should appear");
    }

    @Test
    @DisplayName("intro — empty string produces no intro block")
    void introEmptyNoBlock() {
        String html = EmailTemplateBuilder.create().intro("").title("t").build();
        assertFalse(html.contains("border-left:4px solid"), "No intro block for empty string");
    }

    // ── detail ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("detail — normal label and value are rendered")
    void detailNormalRendered() {
        String html = EmailTemplateBuilder.create().detail("Salle", "B12").title("t").build();
        assertTrue(html.contains("Informations de la formation"), "Section header");
        assertTrue(html.contains("Salle"), "Label");
        assertTrue(html.contains("B12"), "Value");
    }

    @Test
    @DisplayName("detail — null value replaced by dash")
    void detailNullValueDash() {
        String html = EmailTemplateBuilder.create().detail("Label", null).title("t").build();
        assertTrue(html.contains("—"), "Dash placeholder");
    }

    @Test
    @DisplayName("detail — blank value replaced by dash")
    void detailBlankValueDash() {
        String html = EmailTemplateBuilder.create().detail("Label", "   ").title("t").build();
        assertTrue(html.contains("—"), "Dash placeholder for blank");
    }

    @Test
    @DisplayName("detail — multiple details are all rendered")
    void detailMultipleRendered() {
        String html = EmailTemplateBuilder.create()
                .detail("A", "1")
                .detail("B", "2")
                .detail("C", "3")
                .title("t")
                .build();
        assertTrue(html.contains("A"), "Detail A");
        assertTrue(html.contains("1"), "Value 1");
        assertTrue(html.contains("B"), "Detail B");
        assertTrue(html.contains("2"), "Value 2");
        assertTrue(html.contains("C"), "Detail C");
        assertTrue(html.contains("3"), "Value 3");
    }

    @Test
    @DisplayName("detail — special characters in label and value are escaped")
    void detailSpecialCharsEscaped() {
        String html = EmailTemplateBuilder.create()
                .detail("<b>label</b>", "val & \"quoted\"")
                .title("t")
                .build();
        assertTrue(html.contains("&lt;b&gt;label&lt;/b&gt;"), "Label escaped");
        assertTrue(html.contains("val &amp; &quot;quoted&quot;"), "Value escaped");
    }

    // ── seance ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("seance — null is ignored")
    void seanceNullIgnored() {
        String html = EmailTemplateBuilder.create().seance(null).title("t").build();
        assertFalse(html.contains("Calendrier des séances"), "No seance section for null");
    }

    @Test
    @DisplayName("seance — blank is ignored")
    void seanceBlankIgnored() {
        String html = EmailTemplateBuilder.create().seance("   ").title("t").build();
        assertFalse(html.contains("Calendrier des séances"), "No seance section for blank");
    }

    @Test
    @DisplayName("seance — valid line is rendered")
    void seanceValidRendered() {
        String html = EmailTemplateBuilder.create()
                .seance("12/06/2026 · 09:00–12:00 · Salle B12")
                .title("t")
                .build();
        assertTrue(html.contains("Calendrier des séances"), "Section header");
        assertTrue(html.contains("Salle B12"), "Seance line content");
    }

    @Test
    @DisplayName("seance — multiple seances are all rendered")
    void seanceMultipleRendered() {
        String html = EmailTemplateBuilder.create()
                .seance("Seance 1")
                .seance("Seance 2")
                .seance("Seance 3")
                .title("t")
                .build();
        assertTrue(html.contains("Seance 1"), "Seance 1");
        assertTrue(html.contains("Seance 2"), "Seance 2");
        assertTrue(html.contains("Seance 3"), "Seance 3");
    }

    @Test
    @DisplayName("seance — special characters are escaped")
    void seanceSpecialCharsEscaped() {
        String html = EmailTemplateBuilder.create()
                .seance("<script>alert('xss')</script>")
                .title("t")
                .build();
        assertFalse(html.contains("<script>"), "XSS in seance should be escaped");
        assertTrue(html.contains("&lt;script&gt;"), "Seance should be HTML-escaped");
    }

    // ── note ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("note — null produces no note block")
    void noteNullNoBlock() {
        String html = EmailTemplateBuilder.create().note(null).title("t").build();
        assertFalse(html.contains("Action requise"), "No note for null");
        assertFalse(html.contains("border-left:4px solid"), "No note border for null");
    }

    @Test
    @DisplayName("note — blank produces no note block")
    void noteBlankNoBlock() {
        String html = EmailTemplateBuilder.create().note("   ").title("t").build();
        assertFalse(html.contains("border-left:4px solid"), "No note block for blank");
    }

    @Test
    @DisplayName("note — valid text is rendered")
    void noteValidRendered() {
        String html = EmailTemplateBuilder.create().note("Action requise").title("t").build();
        assertTrue(html.contains("Action requise"), "Note text should appear");
        assertTrue(html.contains("border-left:4px solid"), "Note should have border");
        assertTrue(html.contains("background:#fff8e1"), "Note should have yellow background");
    }

    // ── build() — all branches together ──────────────────────────────────

    @Test
    @DisplayName("build — full template with all sections")
    void buildFullTemplate() {
        String html = EmailTemplateBuilder.create()
                .accentColor("#0066cc")
                .icon("📋")
                .title("Notification Complète")
                .greetingName("Jean Dupont")
                .intro("<strong>Bienvenue</strong> dans la formation")
                .detail("Module", "Java Avancé")
                .detail("Durée", "3 jours")
                .seance("12/06/2026 · 09:00–12:00 · Salle A1")
                .seance("13/06/2026 · 09:00–12:00 · Salle A2")
                .note("Pensez à apporter votre laptop")
                .build();

        assertAll(
                () -> assertNotNull(html),
                () -> assertTrue(html.startsWith("<!DOCTYPE html><html>"), "DOCTYPE"),
                () -> assertTrue(html.contains("</html>"), "Closing html"),
                () -> assertTrue(html.contains("📋"), "Icon"),
                () -> assertTrue(html.contains("Notification Complète"), "Title"),
                () -> assertTrue(html.contains("Bonjour Jean Dupont,"), "Greeting"),
                () -> assertTrue(html.contains("<strong>Bienvenue</strong>"), "Intro"),
                () -> assertTrue(html.contains("Informations de la formation"), "Details section"),
                () -> assertTrue(html.contains("Module"), "Detail label"),
                () -> assertTrue(html.contains("Java Avancé"), "Detail value"),
                () -> assertTrue(html.contains("Durée"), "Detail label 2"),
                () -> assertTrue(html.contains("3 jours"), "Detail value 2"),
                () -> assertTrue(html.contains("Calendrier des séances"), "Seances section"),
                () -> assertTrue(html.contains("Salle A1"), "Seance 1"),
                () -> assertTrue(html.contains("Salle A2"), "Seance 2"),
                () -> assertTrue(html.contains("Pensez à apporter votre laptop"), "Note"),
                () -> assertTrue(html.contains("background:#0066cc"), "Accent color"),
                () -> assertTrue(html.contains("Esprit — Direction du Développement et de la Formation"), "Footer")
        );
    }

    @Test
    @DisplayName("build — minimal template (all optional sections absent)")
    void buildMinimalTemplate() {
        String html = EmailTemplateBuilder.create().build();
        assertAll(
                () -> assertNotNull(html),
                () -> assertTrue(html.startsWith("<!DOCTYPE html><html>"), "DOCTYPE"),
                () -> assertTrue(html.contains("Notification"), "Default title"),
                () -> assertTrue(html.contains("Bonjour,"), "Default greeting"),
                () -> assertFalse(html.contains("Informations de la formation"), "No details"),
                () -> assertFalse(html.contains("Calendrier des séances"), "No seances"),
                () -> assertFalse(html.contains("border-left:4px solid"), "No intro or note")
        );
    }

    @Test
    @DisplayName("build — only details, no intro/seance/note")
    void buildOnlyDetails() {
        String html = EmailTemplateBuilder.create()
                .detail("Key", "Value")
                .build();
        assertTrue(html.contains("Informations de la formation"), "Details section");
        assertFalse(html.contains("Calendrier des séances"), "No seances");
    }

    @Test
    @DisplayName("build — only seances, no details/note/intro")
    void buildOnlySeances() {
        String html = EmailTemplateBuilder.create()
                .seance("Line 1")
                .build();
        assertTrue(html.contains("Calendrier des séances"), "Seances section");
        assertFalse(html.contains("Informations de la formation"), "No details");
    }

    @Test
    @DisplayName("build — only note, no details/seance/intro")
    void buildOnlyNote() {
        String html = EmailTemplateBuilder.create()
                .note("Important notice")
                .build();
        assertTrue(html.contains("Important notice"), "Note text");
        assertTrue(html.contains("background:#fff8e1"), "Note background");
        assertFalse(html.contains("Informations de la formation"), "No details");
        assertFalse(html.contains("Calendrier des séances"), "No seances");
    }

    @Test
    @DisplayName("build — only intro, no details/seance/note")
    void buildOnlyIntro() {
        String html = EmailTemplateBuilder.create()
                .intro("This is an intro")
                .build();
        assertTrue(html.contains("This is an intro"), "Intro text");
        assertTrue(html.contains("border-left:4px solid"), "Intro border");
        assertFalse(html.contains("Informations de la formation"), "No details");
    }

    @Test
    @DisplayName("build — icon with blank string shows no icon div")
    void buildIconBlankString() {
        String html = EmailTemplateBuilder.create().icon("").title("t").build();
        assertFalse(html.contains("font-size:42px"), "No icon div for empty string");
    }

    @Test
    @DisplayName("build — greetingName with null produces default greeting")
    void buildGreetingNameNull() {
        String html = EmailTemplateBuilder.create().greetingName(null).title("t").build();
        assertTrue(html.contains("Bonjour,"), "Default greeting");
    }

    @Test
    @DisplayName("build — intro with special HTML characters is rendered safely")
    void buildIntroSpecialChars() {
        String html = EmailTemplateBuilder.create()
                .intro("A < B & C > D")
                .title("t")
                .build();
        assertTrue(html.contains("A < B & C > D"), "Intro should render raw HTML");
    }

    @Test
    @DisplayName("build — all methods chained and returning this")
    void buildFluentChaining() {
        EmailTemplateBuilder b = EmailTemplateBuilder.create();
        assertSame(b, b.accentColor("#111"));
        assertSame(b, b.icon("i"));
        assertSame(b, b.title("t"));
        assertSame(b, b.greetingName("g"));
        assertSame(b, b.intro("intro"));
        assertSame(b, b.detail("l", "v"));
        assertSame(b, b.seance("s"));
        assertSame(b, b.note("n"));
    }

    @Test
    @DisplayName("esc — ampersand is escaped")
    void escAmpersand() {
        String html = EmailTemplateBuilder.create().greetingName("A & B").title("t").build();
        assertTrue(html.contains("A &amp; B"), "Ampersand should be escaped");
    }

    @Test
    @DisplayName("esc — double quote is escaped")
    void escDoubleQuote() {
        String html = EmailTemplateBuilder.create().greetingName("He said \"hi\"").title("t").build();
        assertTrue(html.contains("He said &quot;hi&quot;"), "Double quote should be escaped");
    }

    @Test
    @DisplayName("esc — angle brackets are escaped")
    void escAngleBrackets() {
        String html = EmailTemplateBuilder.create().greetingName("<test>").title("t").build();
        assertTrue(html.contains("&lt;test&gt;"), "Angle brackets should be escaped");
    }

    @Test
    @DisplayName("esc — null passed to esc returns empty (via intro)")
    void escNullReturnsEmpty() {
        String html = EmailTemplateBuilder.create().intro(null).title("t").build();
        assertFalse(html.contains("null"), "null should not appear literally");
    }

    @Test
    @DisplayName("sectionTitle — accent color applied to section headers")
    void sectionTitleAccentColor() {
        String html = EmailTemplateBuilder.create()
                .accentColor("#ff5500")
                .detail("k", "v")
                .title("t")
                .build();
        assertTrue(html.contains("color:#ff5500"), "Section title uses accent color");
        assertTrue(html.contains("border-bottom:2px solid #ff5500"), "Section title border uses accent color");
    }

    @Test
    @DisplayName("wrap — full HTML structure with all meta tags")
    void wrapFullStructure() {
        String html = EmailTemplateBuilder.create().title("t").build();
        assertAll(
                () -> assertTrue(html.contains("<meta charset=\"utf-8\">"), "Charset meta"),
                () -> assertTrue(html.contains("<meta name=\"viewport\""), "Viewport meta"),
                () -> assertTrue(html.contains("background:#f4f6f8"), "Body background"),
                () -> assertTrue(html.contains("role=\"presentation\""), "Accessibility role"),
                () -> assertTrue(html.contains("width=\"600\""), "Table width"),
                () -> assertTrue(html.contains("border-radius:10px"), "Border radius"),
                () -> assertTrue(html.contains("background:#f8f9fa"), "Footer background")
        );
    }

    @Test
    @DisplayName("wrap — no icon div when icon is null")
    void wrapNoIconDivForNull() {
        String html = EmailTemplateBuilder.create().icon(null).title("t").build();
        assertFalse(html.contains("<div style=\"font-size:42px"), "No icon div for null");
    }

    @Test
    @DisplayName("wrap — icon div present when icon is non-empty")
    void wrapIconDivForNonEmpty() {
        String html = EmailTemplateBuilder.create().icon("✉️").title("t").build();
        assertTrue(html.contains("<div style=\"font-size:42px"), "Icon div present");
        assertTrue(html.contains("✉️"), "Icon content");
    }
}
