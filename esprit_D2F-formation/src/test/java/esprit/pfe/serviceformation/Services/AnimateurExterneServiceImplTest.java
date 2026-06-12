package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AnimateurExterneRequest;
import esprit.pfe.serviceformation.entities.AnimateurExterne;
import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.repositories.AnimateurExterneRepository;
import esprit.pfe.serviceformation.repositories.BureauRepository;
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

@ExtendWith(MockitoExtension.class)
class AnimateurExterneServiceImplTest {

    @Mock private AnimateurExterneRepository animateurRepository;
    @Mock private BureauRepository bureauRepository;
    @InjectMocks private AnimateurExterneServiceImpl service;

    private Bureau bureau() {
        Bureau b = new Bureau();
        b.setId(1L);
        b.setNom("Bureau Test");
        return b;
    }

    private AnimateurExterne animateur(Bureau b) {
        AnimateurExterne a = new AnimateurExterne();
        a.setId(10L);
        a.setNom("Dupont");
        a.setPrenom("Jean");
        a.setEmail("jean@test.com");
        a.setBureau(b);
        return a;
    }

    private AnimateurExterneRequest request() {
        AnimateurExterneRequest r = new AnimateurExterneRequest();
        r.setNom("Dupont");
        r.setPrenom("Jean");
        r.setEmail("jean@test.com");
        return r;
    }

    @Test
    void getByBureauReturnsList() {
        Bureau b = bureau();
        when(bureauRepository.findById(1L)).thenReturn(Optional.of(b));
        when(animateurRepository.findByBureauIdOrderByNomAscPrenomAsc(1L))
                .thenReturn(List.of(animateur(b)));

        assertThat(service.getByBureau(1L)).hasSize(1);
    }

    @Test
    void getByBureauThrowsWhenBureauNotFound() {
        when(bureauRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getByBureau(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Bureau introuvable");
    }

    @Test
    void getByIdReturnsAnimateur() {
        Bureau b = bureau();
        AnimateurExterne a = animateur(b);
        when(animateurRepository.findById(10L)).thenReturn(Optional.of(a));

        assertThat(service.getById(1L, 10L).getNom()).isEqualTo("Dupont");
    }

    @Test
    void getByIdThrowsWhenAnimateurNotFound() {
        when(animateurRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getById(1L, 99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Animateur externe introuvable");
    }

    @Test
    void getByIdThrowsWhenBureauMismatch() {
        Bureau b1 = bureau();
        Bureau b2 = new Bureau();
        b2.setId(2L);
        AnimateurExterne a = animateur(b1);
        when(animateurRepository.findById(10L)).thenReturn(Optional.of(a));

        assertThatThrownBy(() -> service.getById(2L, 10L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("n'appartient pas");
    }

    @Test
    void getByIdThrowsWhenAnimateurHasNullBureau() {
        AnimateurExterne a = new AnimateurExterne();
        a.setId(10L);
        a.setBureau(null);
        when(animateurRepository.findById(10L)).thenReturn(Optional.of(a));

        assertThatThrownBy(() -> service.getById(1L, 10L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createReturnsSavedAnimateur() {
        Bureau b = bureau();
        when(bureauRepository.findById(1L)).thenReturn(Optional.of(b));
        when(animateurRepository.save(any(AnimateurExterne.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnimateurExterne result = service.create(1L, request());
        assertThat(result.getNom()).isEqualTo("Dupont");
        assertThat(result.getBureau()).isEqualTo(b);
    }

    @Test
    void updateReturnsUpdatedAnimateur() {
        Bureau b = bureau();
        AnimateurExterne a = animateur(b);
        when(animateurRepository.findById(10L)).thenReturn(Optional.of(a));
        when(animateurRepository.save(any(AnimateurExterne.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnimateurExterneRequest req = new AnimateurExterneRequest();
        req.setNom("Martin");
        req.setPrenom("Paul");
        req.setEmail("paul@test.com");

        AnimateurExterne result = service.update(1L, 10L, req);
        assertThat(result.getNom()).isEqualTo("Martin");
        assertThat(result.getPrenom()).isEqualTo("Paul");
    }

    @Test
    void deleteRemovesAnimateur() {
        Bureau b = bureau();
        AnimateurExterne a = animateur(b);
        when(animateurRepository.findById(10L)).thenReturn(Optional.of(a));

        service.delete(1L, 10L);
        verify(animateurRepository).delete(a);
    }

    @Test
    void deleteThrowsWhenAnimateurNotFound() {
        when(animateurRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.delete(1L, 99L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
