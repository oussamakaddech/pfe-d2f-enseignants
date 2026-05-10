package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnseignantServiceImplTest {

    @Mock private EnseignantRepository repository;
    @InjectMocks private EnseignantServiceImpl service;

    @Test
    void testCreateEnseignant_AutoId() {
        Enseignant last = new Enseignant();
        last.setId("E00042");
        when(repository.findTopByOrderByIdDesc()).thenReturn(Optional.of(last));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00043", saved.getId());
        assertEquals("N", saved.getCup());
    }

    @Test
    void testCreateEnseignant_InvalidIdFormat() {
        Enseignant last = new Enseignant();
        last.setId("XYZ"); // No digits
        when(repository.findTopByOrderByIdDesc()).thenReturn(Optional.of(last));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00001", saved.getId());
    }

    @Test
    void testCreateEnseignant_WithProvidedId() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setId("E00100");
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00100", saved.getId());
        verify(repository, never()).findTopByOrderByIdDesc();
    }

    @Test
    void testCreateEnseignant_WithBlankId() {
        when(repository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setId("");
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00001", saved.getId());
    }

    @Test
    void testCreateEnseignant_WithNullCup() {
        when(repository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setCup(null);
        Enseignant saved = service.createEnseignant(input);

        assertEquals("N", saved.getCup());
    }

    @Test
    void testCreateEnseignant_WithBlankCup() {
        when(repository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setCup("");
        Enseignant saved = service.createEnseignant(input);

        assertEquals("N", saved.getCup());
    }

    @Test
    void testCreateEnseignant_WithNullChefDepartement() {
        when(repository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setChefDepartement(null);
        Enseignant saved = service.createEnseignant(input);

        assertEquals("N", saved.getChefDepartement());
    }

    @Test
    void testCreateEnseignant_WithBlankChefDepartement() {
        when(repository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setChefDepartement("");
        Enseignant saved = service.createEnseignant(input);

        assertEquals("N", saved.getChefDepartement());
    }

    @Test
    void testUpdateEnseignant_Success() {
        Enseignant existing = new Enseignant();
        existing.setId("E00100");
        existing.setNom("Ancien Nom");

        Enseignant updated = new Enseignant();
        updated.setNom("Nouveau Nom");
        updated.setPrenom("Nouveau Prenom");
        updated.setType("Type");
        updated.setEtat("Etat");
        updated.setCup("Y");
        updated.setChefDepartement("Y");

        when(repository.findById("E00100")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant result = service.updateEnseignant("E00100", updated);

        assertEquals("Nouveau Nom", result.getNom());
        assertEquals("Nouveau Prenom", result.getPrenom());
        assertEquals("Type", result.getType());
        assertEquals("Etat", result.getEtat());
        assertEquals("Y", result.getCup());
        assertEquals("Y", result.getChefDepartement());
    }

    @Test
    void testUpdateEnseignant_NotFound() {
        when(repository.findById("1")).thenReturn(Optional.empty());
        Enseignant enseignant = new Enseignant();
        assertThrows(IllegalStateException.class, () -> service.updateEnseignant("1", enseignant));
    }

    @Test
    void testDeleteEnseignant() {
        service.deleteEnseignant("E00100");
        verify(repository, times(1)).deleteById("E00100");
    }

    @Test
    void testGetEnseignantById_Success() {
        Enseignant e = new Enseignant();
        e.setId("E00100");
        e.setNom("Test");

        when(repository.findById("E00100")).thenReturn(Optional.of(e));

        Enseignant result = service.getEnseignantById("E00100");
        assertEquals("E00100", result.getId());
        assertEquals("Test", result.getNom());
    }

    @Test
    void testGetEnseignantById_ByMail() {
        Enseignant e = new Enseignant();
        e.setMail("test@mail.com");
        when(repository.findById("test@mail.com")).thenReturn(Optional.empty());
        when(repository.findByMail("test@mail.com")).thenReturn(Optional.of(e));

        Enseignant result = service.getEnseignantById("test@mail.com");
        assertEquals("test@mail.com", result.getMail());
    }

    @Test
    void testGetEnseignantById_NotFound() {
        when(repository.findById("unknown")).thenReturn(Optional.empty());
        when(repository.findByMail("unknown")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.getEnseignantById("unknown"));
    }

    @Test
    void testGetAllEnseignantsDTO_Empty() {
        when(repository.findAll()).thenReturn(new ArrayList<>());

        List<EnseignantDTO> result = service.getAllEnseignantsDTO();
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetAllEnseignantsDTO_WithEnseignants() {
        Enseignant e1 = new Enseignant();
        e1.setId("E00100");
        e1.setNom("Enseignant 1");
        e1.setPrenom("Prenom 1");
        e1.setMail("e1@mail.com");
        e1.setType("Type 1");

        Enseignant e2 = new Enseignant();
        e2.setId("E00200");
        e2.setNom("Enseignant 2");
        e2.setPrenom("Prenom 2");
        e2.setMail("e2@mail.com");
        e2.setType("Type 2");

        when(repository.findAll()).thenReturn(List.of(e1, e2));

        List<EnseignantDTO> result = service.getAllEnseignantsDTO();
        assertEquals(2, result.size());
        assertEquals("E00100", result.get(0).getId());
        assertEquals("Enseignant 1", result.get(0).getNom());
        assertEquals("E00200", result.get(1).getId());
        assertEquals("Enseignant 2", result.get(1).getNom());
    }
}
