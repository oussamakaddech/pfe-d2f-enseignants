package esprit.pfe.auth.services;

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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Envoi via Microsoft Graph du service auth : construction du message
 * (destinataire, sujet, corps TEXT), boîte d'envoi utilisée, refus d'un
 * destinataire absent et mise en cache du client Graph.
 *
 * <p>Aucun appel réseau : le client Graph est un double injecté dans le cache.</p>
 */
class AuthGraphMailSenderTest {

    private static final String MAILBOX = "Application.Formationdesformateurs@Esprit.tn";

    private AuthGraphMailSender sender;
    private GraphServiceClient<Request> graphClient;
    private UserRequestBuilder userRequestBuilder;
    private UserSendMailRequest sendMailRequest;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        sender = new AuthGraphMailSender();
        ReflectionTestUtils.setField(sender, "clientId", "client-id");
        ReflectionTestUtils.setField(sender, "clientSecret", "client-secret");
        ReflectionTestUtils.setField(sender, "tenantId", "00000000-0000-0000-0000-000000000000");
        ReflectionTestUtils.setField(sender, "graphScope", "https://graph.microsoft.com/.default");
        ReflectionTestUtils.setField(sender, "senderMailbox", MAILBOX);

        graphClient = mock(GraphServiceClient.class);
        userRequestBuilder = mock(UserRequestBuilder.class);
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
    @DisplayName("Message Graph : destinataire, sujet et corps TEXT, envoi depuis la boîte D2F")
    void sendMail_construitLeMessage() {
        injectCachedClient();

        sender.sendMail("enseignant@esprit.tn", "Réinitialisation du mot de passe", "Cliquez sur le lien.");

        ArgumentCaptor<UserSendMailParameterSet> params =
                ArgumentCaptor.forClass(UserSendMailParameterSet.class);
        verify(graphClient).users(MAILBOX);
        verify(userRequestBuilder).sendMail(params.capture());
        verify(sendMailRequest).post();

        UserSendMailParameterSet sent = params.getValue();
        assertEquals("Réinitialisation du mot de passe", sent.message.subject);
        assertEquals(BodyType.TEXT, sent.message.body.contentType);
        assertEquals("Cliquez sur le lien.", sent.message.body.content);
        assertEquals(1, sent.message.toRecipients.size());
        assertEquals("enseignant@esprit.tn", sent.message.toRecipients.get(0).emailAddress.address);
        assertEquals(Boolean.TRUE, sent.saveToSentItems);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("Destinataire absent ou vide : refus explicite, aucun envoi")
    void sendMail_destinataireObligatoire(String to) {
        injectCachedClient();

        assertThrows(IllegalArgumentException.class, () -> sender.sendMail(to, "sujet", "corps"));
        verify(graphClient, never()).users(any(String.class));
    }

    @Test
    @DisplayName("Le client Graph mis en cache est réutilisé d'un envoi à l'autre")
    void clientGraphMisEnCache() {
        injectCachedClient();

        sender.sendMail("enseignant@esprit.tn", "sujet", "1");
        sender.sendMail("enseignant@esprit.tn", "sujet", "2");

        verify(sendMailRequest, times(2)).post();
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
