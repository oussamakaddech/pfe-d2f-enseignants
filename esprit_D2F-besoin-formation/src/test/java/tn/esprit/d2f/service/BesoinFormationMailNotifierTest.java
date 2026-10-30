package tn.esprit.d2f.service;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.ApprovalStep;
import tn.esprit.d2f.entity.enumerations.BesoinStatus;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Notification e-mail D2F (DSI §) : choix du canal (Graph puis repli SMTP),
 * caractère best-effort et contenu du message.
 */
class BesoinFormationMailNotifierTest {

    private static final String RECIPIENT = "application.formationdesformateurs@esprit.tn";
    private static final String FROM = "no-reply@esprit.tn";

    private JavaMailSender mailSender;
    private BesoinGraphMailSender graphSender;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        graphSender = mock(BesoinGraphMailSender.class);
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<BesoinGraphMailSender> provider(BesoinGraphMailSender sender) {
        ObjectProvider<BesoinGraphMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        return provider;
    }

    private BesoinFormationMailNotifier notifier(JavaMailSender sender,
                                                 BesoinGraphMailSender graph,
                                                 String recipient,
                                                 String host) {
        return new BesoinFormationMailNotifier(sender, provider(graph), recipient, FROM, host);
    }

    private static BesoinFormation besoin() {
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(42L);
        b.setTitre("Atelier Kubernetes");
        b.setTheme("Cloud");
        b.setTypeBesoin(TypeBesoin.COLLECTIF);
        b.setPriorite(Priorite.HAUTE);
        b.setUp("UP_INFO");
        b.setDepartement("DEPT_GL");
        b.setStatus(BesoinStatus.SUBMITTED);
        b.setCurrentApprovalStep(ApprovalStep.CHEF_DEPARTEMENT);
        return b;
    }

    @Test
    @DisplayName("Graph disponible : envoi via Microsoft Graph, SMTP non sollicité")
    void graphPrioritaire() {
        BesoinFormationMailNotifier notifier = notifier(mailSender, graphSender, RECIPIENT, "smtp.office365.com");

        notifier.notifyD2FBesoinChanged(besoin(), "CUP", "ajouté", "cup@esprit.tn");

        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(graphSender).sendMail(eq(RECIPIENT), subject.capture(), html.capture());
        verify(mailSender, never()).send(any(MimeMessage.class));
        assertTrue(subject.getValue().contains("ajouté"));
        assertTrue(subject.getValue().contains("42"));
        assertTrue(html.getValue().contains("Atelier Kubernetes"));
        assertTrue(html.getValue().contains("CUP"));
    }

    @Test
    @DisplayName("Graph en échec : repli SMTP, aucune exception propagée")
    void graphEnEchecRepliSmtp() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((jakarta.mail.Session) null));
        doThrow(new IllegalStateException("Graph HS"))
                .when(graphSender).sendMail(anyString(), anyString(), anyString());
        BesoinFormationMailNotifier notifier = notifier(mailSender, graphSender, RECIPIENT, "smtp.office365.com");

        assertDoesNotThrow(() ->
                notifier.notifyD2FBesoinChanged(besoin(), "CHEF_DEPARTEMENT", "modifié", "chef@esprit.tn"));

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Sans Graph : envoi SMTP avec sujet, destinataire et corps HTML")
    void envoiSmtp() throws Exception {
        MimeMessage message = new MimeMessage((jakarta.mail.Session) null);
        when(mailSender.createMimeMessage()).thenReturn(message);
        BesoinFormationMailNotifier notifier = notifier(mailSender, null, RECIPIENT, "smtp.office365.com");

        notifier.notifyD2FBesoinChanged(besoin(), "CUP", "ajouté", "cup@esprit.tn");

        verify(mailSender).send(message);
        assertTrue(message.getSubject().contains("Besoin de formation ajouté"));
        assertTrue(message.getAllRecipients()[0].toString().contains(RECIPIENT));
    }

    @Test
    @DisplayName("Échec SMTP : best-effort, la transaction métier n'est jamais rompue")
    void echecSmtpNonBloquant() {
        when(mailSender.createMimeMessage()).thenThrow(new IllegalStateException("SMTP HS"));
        BesoinFormationMailNotifier notifier = notifier(mailSender, null, RECIPIENT, "smtp.office365.com");

        assertDoesNotThrow(() ->
                notifier.notifyD2FBesoinChanged(besoin(), "CUP", "ajouté", "cup@esprit.tn"));
    }

    @Test
    @DisplayName("Host SMTP absent ou JavaMailSender absent : notification ignorée")
    void mailDesactive() {
        notifier(mailSender, null, RECIPIENT, "  ")
                .notifyD2FBesoinChanged(besoin(), "CUP", "ajouté", "cup@esprit.tn");
        notifier(null, null, RECIPIENT, "smtp.office365.com")
                .notifyD2FBesoinChanged(besoin(), "CUP", "ajouté", "cup@esprit.tn");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Destinataire non configuré : aucun envoi, aucun canal sollicité")
    void destinataireNonConfigure() {
        BesoinFormationMailNotifier notifier = notifier(mailSender, graphSender, "  ", "smtp.office365.com");

        notifier.notifyD2FBesoinChanged(besoin(), "CUP", "ajouté", "cup@esprit.tn");

        verify(graphSender, never()).sendMail(anyString(), anyString(), anyString());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Besoin null : contrat explicite (NullPointerException)")
    void besoinNull() {
        BesoinFormationMailNotifier notifier = notifier(mailSender, graphSender, RECIPIENT, "smtp.office365.com");

        assertThrows(NullPointerException.class,
                () -> notifier.notifyD2FBesoinChanged(null, "CUP", "ajouté", "cup@esprit.tn"));
    }

    @Test
    @DisplayName("Libellé du rôle : CUP, Chef de département, sinon D2F")
    void libellesDeRole() {
        BesoinFormationMailNotifier notifier = notifier(mailSender, graphSender, RECIPIENT, "smtp.office365.com");
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);

        notifier.notifyD2FBesoinChanged(besoin(), "CUP", "ajouté", "a@esprit.tn");
        notifier.notifyD2FBesoinChanged(besoin(), "chef_departement", "modifié", "b@esprit.tn");
        notifier.notifyD2FBesoinChanged(besoin(), "ADMIN", "modifié", "c@esprit.tn");

        verify(graphSender, times(3))
                .sendMail(eq(RECIPIENT), anyString(), html.capture());
        assertTrue(html.getAllValues().get(0).contains("<strong>CUP</strong>"));
        assertTrue(html.getAllValues().get(1).contains("Chef de département"));
        assertTrue(html.getAllValues().get(2).contains("<strong>D2F</strong>"));
    }

    @Test
    @DisplayName("Champs absents : rendus « - », et le HTML utilisateur est échappé")
    void champsAbsentsEtEchappement() {
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(7L);
        b.setTitre("<script>alert('x')</script>");
        BesoinFormationMailNotifier notifier = notifier(mailSender, graphSender, RECIPIENT, "smtp.office365.com");
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);

        notifier.notifyD2FBesoinChanged(b, "CUP", "ajouté", null);

        verify(graphSender).sendMail(eq(RECIPIENT), anyString(), html.capture());
        String body = html.getValue();
        assertFalse(body.contains("<script>"));
        assertTrue(body.contains("&lt;script&gt;"));
        // Thème, type, priorité, UP, département, statut et étape sont absents.
        assertTrue(body.contains(">-</td>"));
    }
}
