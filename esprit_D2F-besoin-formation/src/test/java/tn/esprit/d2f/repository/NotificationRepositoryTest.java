package tn.esprit.d2f.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import tn.esprit.d2f.entity.Notification;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class NotificationRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private NotificationRepository repository;

    private Notification notification1;
    private Notification notification2;
    private Notification notification3;

    @BeforeEach
    void setUp() {
        notification1 = new Notification();
        notification1.setUsername("user1");
        notification1.setMessage("Message 1");
        notification1.setCommentaire("Commentaire 1");

        notification2 = new Notification();
        notification2.setUsername("user1");
        notification2.setMessage("Message 2");
        notification2.setCommentaire("Commentaire 2");

        notification3 = new Notification();
        notification3.setUsername("user2");
        notification3.setMessage("Message 3");
        notification3.setCommentaire("Commentaire 3");

        entityManager.persist(notification1);
        entityManager.persist(notification2);
        entityManager.persist(notification3);
        entityManager.flush();
    }

    @Test
    void testFindByUsername() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notification> result = repository.findByUsername("user1", pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertTrue(result.getContent().stream().allMatch(n -> "user1".equals(n.getUsername())));
    }

    @Test
    void testFindByUsernameWithNoResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notification> result = repository.findByUsername("user3", pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void testFindByUsernameWithPagination() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Notification> result = repository.findByUsername("user1", pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertEquals(1, result.getContent().size());
        assertEquals(2, result.getTotalPages());
    }

    @Test
    void testSaveNotification() {
        Notification notification = new Notification();
        notification.setUsername("user3");
        notification.setMessage("Message 4");
        notification.setCommentaire("Commentaire 4");

        Notification saved = repository.save(notification);

        assertNotNull(saved);
        assertNotNull(saved.getIdNotification());
        assertEquals("user3", saved.getUsername());
        assertEquals("Message 4", saved.getMessage());
        assertEquals("Commentaire 4", saved.getCommentaire());
        assertNotNull(saved.getCreatedAt());
    }

    @Test
    void testDeleteNotification() {
        Long id = notification1.getIdNotification();
        repository.deleteById(id);

        Notification deleted = entityManager.find(Notification.class, id);
        assertNull(deleted);
    }

    @Test
    void testFindById() {
        Long id = notification1.getIdNotification();
        Notification found = repository.findById(id).orElse(null);

        assertNotNull(found);
        assertEquals("user1", found.getUsername());
        assertEquals("Message 1", found.getMessage());
        assertEquals("Commentaire 1", found.getCommentaire());
    }

    @Test
    void testFindByIdWithInvalidId() {
        Notification found = repository.findById(999L).orElse(null);

        assertNull(found);
    }

    @Test
    void testUpdateNotification() {
        notification1.setMessage("Updated Message");
        notification1.setCommentaire("Updated Commentaire");

        Notification updated = repository.save(notification1);

        assertNotNull(updated);
        assertEquals("Updated Message", updated.getMessage());
        assertEquals("Updated Commentaire", updated.getCommentaire());
    }

    @Test
    void testNotificationCreatedAtIsSet() {
        Notification notification = new Notification();
        notification.setUsername("user3");
        notification.setMessage("Message");
        notification.setCommentaire("Commentaire");

        Notification saved = repository.save(notification);

        assertNotNull(saved.getCreatedAt());
        assertTrue(saved.getCreatedAt().isBefore(LocalDateTime.now().plusSeconds(1)));
        assertTrue(saved.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(1)));
    }

    @Test
    void testFindAllNotifications() {
        Page<Notification> result = repository.findAll(PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(3, result.getTotalElements());
    }
}
