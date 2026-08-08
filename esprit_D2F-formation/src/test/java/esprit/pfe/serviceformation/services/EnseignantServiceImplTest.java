package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.exception.DuplicateEnseignantException;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnseignantServiceImplTest {

    @Mock private EnseignantRepository repository;
    @Mock private UpRepository upRepository;
    @Mock private DeptRepository deptRepository;
    @InjectMocks private EnseignantServiceImpl service;

    @Test
    void testCreateEnseignant_AutoId() {
        when(repository.findMaxNumericIdIncludingDeleted()).thenReturn(42);
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00043", saved.getId());
        assertEquals("N", saved.getCup());
    }

    @Test
    void testCreateEnseignant_SkipsSoftDeletedPkCollision() {
        // Bug reproduit : E00001 existe encore physiquement (soft-deleted) → la PK
        // est occupée. Le générateur doit l'enjamber au lieu de violer enseignants_pkey.
        when(repository.findMaxNumericIdIncludingDeleted()).thenReturn(0);
        when(repository.existsByIdIncludingDeleted("E00001")).thenReturn(true);
        when(repository.existsByIdIncludingDeleted("E00002")).thenReturn(false);
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant saved = service.createEnseignant(new Enseignant());

        assertEquals("E00002", saved.getId());
    }

    @Test
    void testCreateEnseignant_WithProvidedId() {
        when(repository.existsByIdIncludingDeleted("E00100")).thenReturn(false);
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setId("E00100");
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00100", saved.getId());
        verify(repository, never()).findMaxNumericIdIncludingDeleted();
    }

    @Test
    void testCreateEnseignant_WithBlankId() {
        when(repository.findMaxNumericIdIncludingDeleted()).thenReturn(0);
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setId("");
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00001", saved.getId());
    }

    @Test
    void testCreateEnseignant_WithNullCup() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setCup(null);
        Enseignant saved = service.createEnseignant(input);

        assertEquals("N", saved.getCup());
    }

    @Test
    void testCreateEnseignant_WithBlankCup() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setCup("");
        Enseignant saved = service.createEnseignant(input);

        assertEquals("N", saved.getCup());
    }

    @Test
    void testCreateEnseignant_WithNullChefDepartement() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setChefDepartement(null);
        Enseignant saved = service.createEnseignant(input);

        assertEquals("N", saved.getChefDepartement());
    }

    @Test
    void testCreateEnseignant_WithBlankChefDepartement() {
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
    void testDeleteEnseignant_SoftDelete() {
        Enseignant e = new Enseignant();
        e.setId("E00100");
        when(repository.findById("E00100")).thenReturn(Optional.of(e));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.deleteEnseignant("E00100");

        // Suppression logique : deleted_at renseigné, pas de suppression physique.
        assertNotNull(e.getDeletedAt());
        verify(repository).save(e);
        verify(repository, never()).deleteById("E00100");
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

    @Test
    void createEnseignant_duplicateEmailThrows() {
        Enseignant input = new Enseignant();
        input.setMail("existing@esprit.tn");
        when(repository.existsByMail("existing@esprit.tn")).thenReturn(true);

        assertThrows(DuplicateEnseignantException.class, () -> service.createEnseignant(input));
    }

    @Test
    void createEnseignant_resolvesUpAndDept() {
        Up up = new Up();
        up.setId("UP1");
        up.setLibelle("Informatique");
        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Département Info");

        when(repository.findMaxNumericIdIncludingDeleted()).thenReturn(42);
        when(repository.existsByIdIncludingDeleted("E00043")).thenReturn(false);
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(upRepository.findById("UP1")).thenReturn(Optional.of(up));
        when(deptRepository.findById("D1")).thenReturn(Optional.of(dept));

        Enseignant input = new Enseignant();
        input.setUp(up);
        input.setDept(dept);
        Enseignant saved = service.createEnseignant(input);

        assertNotNull(saved.getUp());
        assertEquals("UP1", saved.getUp().getId());
        assertNotNull(saved.getDept());
        assertEquals("D1", saved.getDept().getId());
        assertEquals("P", saved.getType());
        assertEquals("A", saved.getEtat());
    }

    @Test
    void createEnseignant_upNotFoundThrows() {
        Up up = new Up();
        up.setId("UP_UNKNOWN");
        Enseignant input = new Enseignant();
        input.setUp(up);
        when(upRepository.findById("UP_UNKNOWN")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.createEnseignant(input));
    }

    @Test
    void createEnseignant_nullIdGeneratesAutomatically() {
        when(repository.findMaxNumericIdIncludingDeleted()).thenReturn(0);
        when(repository.existsByIdIncludingDeleted("E00001")).thenReturn(false);
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setId(null);
        Enseignant saved = service.createEnseignant(input);

        assertEquals("E00001", saved.getId());
    }

    @Test
    void linkOrCreateEnseignant_existingByMail() {
        Enseignant existing = new Enseignant();
        existing.setId("E001");
        existing.setMail("test@esprit.tn");
        when(repository.findByMailIgnoreCase("test@esprit.tn")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant input = new Enseignant();
        input.setMail("test@esprit.tn");
        input.setUserId("user123");
        Enseignant result = service.linkOrCreateEnseignant(input);

        assertEquals("E001", result.getId());
        assertEquals("user123", result.getUserId());
        verify(repository).save(existing);
    }

    @Test
    void linkOrCreateEnseignant_existingLinkedToDifferentAccountThrows() {
        Enseignant existing = new Enseignant();
        existing.setId("E001");
        existing.setMail("test@esprit.tn");
        existing.setUserId("otherUser");
        when(repository.findByMailIgnoreCase("test@esprit.tn")).thenReturn(Optional.of(existing));

        Enseignant input = new Enseignant();
        input.setMail("test@esprit.tn");
        input.setUserId("newUser");

        assertThrows(DuplicateEnseignantException.class, () -> service.linkOrCreateEnseignant(input));
    }

    @Test
    void linkOrCreateEnseignant_noExistingMail_creates() {
        when(repository.findMaxNumericIdIncludingDeleted()).thenReturn(0);
        when(repository.existsByIdIncludingDeleted("E00001")).thenReturn(false);
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(repository.findByMailIgnoreCase("test@esprit.tn")).thenReturn(Optional.empty());

        Enseignant input = new Enseignant();
        input.setMail("test@esprit.tn");
        Enseignant result = service.linkOrCreateEnseignant(input);

        assertEquals("E00001", result.getId());
    }

    @Test
    void deleteEnseignant_notFoundThrows() {
        when(repository.findById("UNKNOWN")).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.deleteEnseignant("UNKNOWN"));
    }

    @Test
    void getEnseignantById_caseInsensitiveMailFallback() {
        Enseignant e = new Enseignant();
        e.setMail("Test@Esprit.Tn");
        when(repository.findById("Test@Esprit.Tn")).thenReturn(Optional.empty());
        when(repository.findByMail("Test@Esprit.Tn")).thenReturn(Optional.empty());
        when(repository.findByMailIgnoreCase("Test@Esprit.Tn")).thenReturn(Optional.of(e));

        Enseignant result = service.getEnseignantById("Test@Esprit.Tn");

        assertEquals("Test@Esprit.Tn", result.getMail());
    }

    @Test
    void getEnseignantById_nullIdThrows() {
        assertThrows(IllegalArgumentException.class, () -> service.getEnseignantById((String) null));
    }

    @Test
    void getAllEnseignantsDTO_paginated() {
        Enseignant e = new Enseignant();
        e.setId("E001");
        e.setNom("Test");
        Page<Enseignant> page = new PageImpl<>(List.of(e));

        when(repository.findAll(any(PageRequest.class))).thenReturn(page);

        Page<EnseignantDTO> result = service.getAllEnseignantsDTO(PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("E001", result.getContent().get(0).getId());
    }

    @Test
    void toDTO_withUpAndDept() {
        Up up = new Up();
        up.setId("UP1");
        up.setLibelle("Info");
        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Département Info");
        Enseignant e = new Enseignant();
        e.setId("E001");
        e.setNom("Test");
        e.setUp(up);
        e.setDept(dept);

        EnseignantDTO dto = service.toDTO(e);

        assertEquals("UP1", dto.getUpId());
        assertEquals("Info", dto.getUpLibelle());
        assertEquals("D1", dto.getDeptId());
        assertEquals("Département Info", dto.getDeptLibelle());
    }

    @Test
    void updateEnseignant_setsMailAndGradeAndSpecialite() {
        Enseignant existing = new Enseignant();
        existing.setId("E001");
        Enseignant updated = new Enseignant();
        updated.setMail("new@esprit.tn");
        updated.setGrade("MCF");
        updated.setSpecialite("Informatique");
        updated.setTelephone("123456789");
        updated.setPhotoUrl("http://photo");
        updated.setUserId("user123");

        when(repository.findById("E001")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Enseignant result = service.updateEnseignant("E001", updated);

        assertEquals("new@esprit.tn", result.getMail());
        assertEquals("MCF", result.getGrade());
        assertEquals("Informatique", result.getSpecialite());
        assertEquals("123456789", result.getTelephone());
        assertEquals("http://photo", result.getPhotoUrl());
        assertEquals("user123", result.getUserId());
    }
}
