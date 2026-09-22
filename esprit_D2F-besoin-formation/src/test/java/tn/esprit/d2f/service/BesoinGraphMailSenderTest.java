package tn.esprit.d2f.service;

import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.UserSendMailParameterSet;
import com.microsoft.graph.requests.GraphServiceClient;
import com.microsoft.graph.requests.UserRequestBuilder;
import com.microsoft.graph.requests.UserSendMailRequest;
import com.microsoft.graph.requests.UserSendMailRequestBuilder;
import okhttp3.Request;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Envoi via Microsoft Graph : construction du message (destinataire, sujet,
 * corps HTML), boîte d'envoi utilisée et mise en cache du client Graph.
 *
 * <p>Aucun appel réseau : le client Graph est un double injecté dans le cache.</p>
 */
class BesoinGraphMailSenderTest {

    private static final String MAILBOX = "Application.Formationdesformateurs@Esprit.tn";

    private BesoinGraphMailSender sender;
    private GraphServiceClient<Request> graphClient;
    private UserSendMailRequest sendMailRequest;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        sender = new BesoinGraphMailSender();
        ReflectionTestUtils.setField(sender, "clientId", "client-id");
        ReflectionTestUtils.setField(sender, "clientSecret", "client-secret");
        ReflectionTestUtils.setField(sender, "tenantId", "00000000-0000-0000-0000-000000000000");
        ReflectionTestUtils.setField(sender, "graphScope", "https://graph.microsoft.com/.default");
        ReflectionTestUtils.setField(sender, "senderMailbox", MAILBOX);

        graphClient = mock(GraphServiceClient.class);
        UserRequestBuilder userRequestBuilder = mock(UserRequestBuilder.class);
        UserSendMailRequestBuilder sendMailRequestBuilder = mock(UserSendMailRequestBuilder.class);
        sendMailRequest = mock(UserSendMailRequest.class);
        when(graphClient.users(MAILBOX)).thenReturn(userRequestBuilder);
        when(userRequestBuilder.sendMail(any(UserSendMailParameterSet.class))).thenReturn(sendMailRequestBuilder);
        when(sendMailRequestBuilder.buildRequest()).thenReturn(sendMailRequest);
    }

    @SuppressWarnings("unchecked")
    private void injectCachedClient() {
        AtomicReference<GraphServiceClient<Request>> cache =
                (AtomicReference<GraphServiceClient<Request>>)
                        ReflectionTestUtils.getField(sender, "cachedClient");
        assertNotNull(cache);
        cache.set(graphClient);
    }

    @Test
    @DisplayName("Message Graph : destinataire, sujet et corps HTML, envoi depuis la boîte D2F")
    void sendMail_construitLeMessage() {
        injectCachedClient();

        sender.sendMail("d2f@esprit.tn", "[D2F] Besoin n°42", "<html><body>Bonjour</body></html>");

        ArgumentCaptor<UserSendMailParameterSet> params =
                ArgumentCaptor.forClass(UserSendMailParameterSet.class);
        verify(graphClient).users(MAILBOX);
        verify(graphClient.users(MAILBOX)).sendMail(params.capture());
        verify(sendMailRequest).post();

        UserSendMailParameterSet sent = params.getValue();
        assertEquals("[D2F] Besoin n°42", sent.message.subject);
        assertEquals(BodyType.HTML, sent.message.body.contentType);
        assertEquals("<html><body>Bonjour</body></html>", sent.message.body.content);
        assertEquals(1, sent.message.toRecipients.size());
        assertEquals("d2f@esprit.tn", sent.message.toRecipients.get(0).emailAddress.address);
        assertEquals(Boolean.TRUE, sent.saveToSentItems);
    }

    @Test
    @DisplayName("Le client Graph mis en cache est réutilisé d'un envoi à l'autre")
    void clientGraphMisEnCache() {
        injectCachedClient();

        sender.sendMail("d2f@esprit.tn", "sujet", "<p>1</p>");
        sender.sendMail("d2f@esprit.tn", "sujet", "<p>2</p>");

        verify(sendMailRequest, org.mockito.Mockito.times(2)).post();
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("Cache vide : le client est construit une fois puis mémorisé (sans appel réseau)")
    void clientGraphConstruitEtMemorise() {
        Object client = ReflectionTestUtils.invokeMethod(sender, "getGraphClient");

        assertNotNull(client);
        AtomicReference<GraphServiceClient<Request>> cache =
                (AtomicReference<GraphServiceClient<Request>>)
                        ReflectionTestUtils.getField(sender, "cachedClient");
        assertNotNull(cache);
        assertSame(client, cache.get());
        assertSame(client, ReflectionTestUtils.invokeMethod(sender, "getGraphClient"));
    }

    @Test
    @DisplayName("Identifiants Azure AD absents : la construction du client échoue explicitement")
    void identifiantsAbsents() {
        ReflectionTestUtils.setField(sender, "clientId", null);

        assertThrows(Exception.class, () -> ReflectionTestUtils.invokeMethod(sender, "getGraphClient"));
    }
}
