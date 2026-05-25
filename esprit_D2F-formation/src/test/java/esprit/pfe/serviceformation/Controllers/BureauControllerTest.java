
package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.services.BureauService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BureauController - Tests")
class BureauControllerTest {

    @Mock
    private BureauService bureauService;

    @InjectMocks
    private BureauController bureauController;

    private Bureau bureau;

    private Bureau createBureau(Long id, String nom, String email, String tel) {
        Bureau b = new Bureau();
        b.setId(id);
        b.setNom(nom);
        b.setEmail(email);
        b.setNumeroTelephone(tel);
        return b;
    }

    @BeforeEach
    void setUp() {
        bureau = createBureau(1L, "Bureau Formation", "bf@test.com", "123");
    }

    @Test
    @DisplayName("getAllBureaux: retourne la liste des bureaux")
    void getAllBureaux_returnsList() {
        when(bureauService.getAllBureaux(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(bureau)));

        ResponseEntity<Page<Bureau>> response = bureauController.getAllBureaux(Pageable.unpaged());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getBureauById: retourne le bureau")
    void getBureauById_returnsBureau() {
        when(bureauService.getBureauById(1L)).thenReturn(bureau);

        ResponseEntity<Bureau> response = bureauController.getBureauById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getNom()).isEqualTo("Bureau Formation");
    }

    @Test
    @DisplayName("createBureau: retourne 201 Created")
    void createBureau_returnsCreated() {
        when(bureauService.createBureau(any(Bureau.class))).thenReturn(bureau);

        ResponseEntity<Bureau> response = bureauController.createBureau(bureau);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        verify(bureauService).createBureau(bureau);
    }

    @Test
    @DisplayName("updateBureau: retourne le bureau mis a jour")
    void updateBureau_returnsUpdated() {
        Bureau updated = createBureau(1L, "Updated", null, null);
        when(bureauService.updateBureau(eq(1L), any(Bureau.class))).thenReturn(updated);

        ResponseEntity<Bureau> response = bureauController.updateBureau(1L, updated);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("deleteBureau: retourne 204 No Content")
    void deleteBureau_returnsNoContent() {
        ResponseEntity<Void> response = bureauController.deleteBureau(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(bureauService).deleteBureau(1L);
    }
}
