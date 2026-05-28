

package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.repositories.BureauRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
@DisplayName("BureauServiceImpl - Tests")
class BureauServiceImplTest {

    @Mock
    private BureauRepository bureauRepository;

    @InjectMocks
    private BureauServiceImpl bureauService;

    private Bureau createBureau(Long id, String nom, String email, String tel) {
        Bureau b = new Bureau();
        b.setId(id);
        b.setNom(nom);
        b.setEmail(email);
        b.setNumeroTelephone(tel);
        return b;
    }

    @Test
    @DisplayName("getAllBureaux: retourne tous les bureaux")
    void getAllBureaux_returnsAll() {
        Bureau b1 = createBureau(1L, "B1", "b1@test.com", "111");
        Bureau b2 = createBureau(2L, "B2", "b2@test.com", "222");
        when(bureauRepository.findAll()).thenReturn(List.of(b1, b2));

        List<Bureau> result = bureauService.getAllBureaux();

        assertThat(result).hasSize(2);
        verify(bureauRepository).findAll();
    }

    @Test
    @DisplayName("getAllBureaux(pageable): retourne une page")
    void getAllBureauxPageable_returnsPage() {
        Page<Bureau> page = new PageImpl<>(List.of(createBureau(1L, "B1", "b1@test.com", "111")));
        when(bureauRepository.findAll(any(PageRequest.class))).thenReturn(page);

        Page<Bureau> result = bureauService.getAllBureaux(PageRequest.of(0, 10));

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getBureauById: retourne le bureau quand il existe")
    void getBureauById_whenFound_returnsBureau() {
        Bureau bureau = createBureau(1L, "B1", "b1@test.com", "111");
        when(bureauRepository.findById(1L)).thenReturn(Optional.of(bureau));

        Bureau result = bureauService.getBureauById(1L);

        assertThat(result.getNom()).isEqualTo("B1");
    }

    @Test
    @DisplayName("getBureauById: leve exception quand introuvable")
    void getBureauById_whenNotFound_throwsException() {
        when(bureauRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bureauService.getBureauById(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Bureau introuvable");
    }

    @Test
    @DisplayName("createBureau: sauvegarde et retourne le bureau")
    void createBureau_savesAndReturns() {
        Bureau bureau = createBureau(null, "New", "new@test.com", "111");
        Bureau saved = createBureau(1L, "New", "new@test.com", "111");
        when(bureauRepository.save(any(Bureau.class))).thenReturn(saved);

        Bureau result = bureauService.createBureau(bureau);

        assertThat(result.getId()).isEqualTo(1L);
        verify(bureauRepository).save(bureau);
    }

    @Test
    @DisplayName("updateBureau: met a jour et retourne le bureau")
    void updateBureau_updatesAndReturns() {
        Bureau existing = createBureau(1L, "Old", "old@test.com", "111");
        Bureau updated = createBureau(null, "New", "new@test.com", "222");
        when(bureauRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(bureauRepository.save(any(Bureau.class))).thenAnswer(inv -> inv.getArgument(0));

        Bureau result = bureauService.updateBureau(1L, updated);

        assertThat(result.getNom()).isEqualTo("New");
        assertThat(result.getEmail()).isEqualTo("new@test.com");
        assertThat(result.getNumeroTelephone()).isEqualTo("222");
    }

    @Test
    @DisplayName("updateBureau: leve exception quand bureau introuvable")
    void updateBureau_whenNotFound_throwsException() {
        Bureau updated = createBureau(null, "New", null, null);
        when(bureauRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bureauService.updateBureau(99L, updated))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("deleteBureau: supprime quand le bureau existe")
    void deleteBureau_whenExists_deletes() {
        when(bureauRepository.existsById(1L)).thenReturn(true);
        doNothing().when(bureauRepository).deleteById(1L);

        bureauService.deleteBureau(1L);

        verify(bureauRepository).deleteById(1L);
    }

    @Test
    @DisplayName("deleteBureau: leve exception quand bureau introuvable")
    void deleteBureau_whenNotFound_throwsException() {
        when(bureauRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> bureauService.deleteBureau(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Bureau introuvable");
        verify(bureauRepository, never()).deleteById(any());
    }
}

