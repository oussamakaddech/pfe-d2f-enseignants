package tn.esprit.d2f.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class NotificationTest {

    @Test
    void testConstructorAndGettersSetters() {
        Notification notification = new Notification();
        notification.setIdNotification(1L);
        notification.setUsername("user1");
        notification.setMessage("Message");
        notification.setCommentaire("Commentaire");
        LocalDateTime now = LocalDateTime.now();
        notification.setCreatedAt(now);

        assertEquals(1L, notification.getIdNotification());
        assertEquals("user1", notification.getUsername());
        assertEquals("Message", notification.getMessage());
        assertEquals("Commentaire", notification.getCommentaire());
        assertEquals(now, notification.getCreatedAt());
    }

    @Test
    void testAllArgsConstructor() {
        Notification notification = new Notification();
        notification.setIdNotification(1L);
        notification.setUsername("user1");
        notification.setMessage("Message");
        notification.setCommentaire("Commentaire");

        assertEquals(1L, notification.getIdNotification());
        assertEquals("user1", notification.getUsername());
        assertEquals("Message", notification.getMessage());
        assertEquals("Commentaire", notification.getCommentaire());
    }

    @Test
    void testDefaultCreatedAt() {
        // createdAt is JPA-managed via @CreatedDate; it is null until the entity is persisted
        Notification notification = new Notification();
        assertNull(notification.getCreatedAt());
    }

    @Test
    void testSetCreatedAt() {
        Notification notification = new Notification();
        LocalDateTime now = LocalDateTime.now();
        notification.setCreatedAt(now);

        assertEquals(now, notification.getCreatedAt());
    }

    @Test
    void testWithNullValues() {
        Notification notification = new Notification();
        notification.setUsername(null);
        notification.setMessage(null);
        notification.setCommentaire(null);

        assertNull(notification.getUsername());
        assertNull(notification.getMessage());
        assertNull(notification.getCommentaire());
    }

    @Test
    void testWithEmptyStrings() {
        Notification notification = new Notification();
        notification.setUsername("");
        notification.setMessage("");
        notification.setCommentaire("");

        assertEquals("", notification.getUsername());
        assertEquals("", notification.getMessage());
        assertEquals("", notification.getCommentaire());
    }

    @Test
    void testIdSetter() {
        Notification notification = new Notification();
        notification.setIdNotification(1L);

        assertEquals(1L, notification.getIdNotification());
    }

    @Test
    void testUsernameSetter() {
        Notification notification = new Notification();
        notification.setUsername("user1");

        assertEquals("user1", notification.getUsername());
    }

    @Test
    void testMessageSetter() {
        Notification notification = new Notification();
        notification.setMessage("Message");

        assertEquals("Message", notification.getMessage());
    }

    @Test
    void testCommentaireSetter() {
        Notification notification = new Notification();
        notification.setCommentaire("Commentaire");

        assertEquals("Commentaire", notification.getCommentaire());
    }

    @Test
    void testCreatedAtIsNullBeforePersistence() {
        // createdAt is populated by JPA auditing at persist time, not at construction
        Notification notification = new Notification();
        assertNull(notification.getCreatedAt());

        LocalDateTime now = LocalDateTime.now();
        notification.setCreatedAt(now);
        assertEquals(now, notification.getCreatedAt());
    }

    @Test
    void testMultipleNotificationsHaveDifferentInstances() {
        Notification notification1 = new Notification();
        Notification notification2 = new Notification();

        // Each notification is a distinct object; createdAt is null until JPA persists them
        assertNotSame(notification1, notification2);
        assertNull(notification1.getCreatedAt());
        assertNull(notification2.getCreatedAt());
    }

    @Test
    void testSetCreatedAtToNull() {
        Notification notification = new Notification();
        notification.setCreatedAt(null);

        assertNull(notification.getCreatedAt());
    }

    @Test
    void testLongMessage() {
        Notification notification = new Notification();
        String longMessage = "A".repeat(1000);
        notification.setMessage(longMessage);

        assertEquals(longMessage, notification.getMessage());
    }

    @Test
    void testSpecialCharactersInFields() {
        Notification notification = new Notification();
        notification.setUsername("user@domain.com");
        notification.setMessage("Message with émojis 🎉 and special chars !@#$%");
        notification.setCommentaire("Commentaire with accents: éàü");

        assertEquals("user@domain.com", notification.getUsername());
        assertEquals("Message with émojis 🎉 and special chars !@#$%", notification.getMessage());
        assertEquals("Commentaire with accents: éàü", notification.getCommentaire());
    }
}
