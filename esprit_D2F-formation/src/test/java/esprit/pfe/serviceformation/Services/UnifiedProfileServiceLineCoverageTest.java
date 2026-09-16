package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.common.PageResponse;
import esprit.pfe.serviceformation.dto.AccountSummaryDTO;
import esprit.pfe.serviceformation.dto.AccountSummaryRequest;
import esprit.pfe.serviceformation.dto.AdvancedFilterRequest;
import esprit.pfe.serviceformation.dto.DeptDTO;
import esprit.pfe.serviceformation.dto.UnifiedProfileDTO;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.feign.AuthAccountClient;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.Month;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnifiedProfileServiceLineCoverageTest {

    @Mock private EnseignantRepository enseignantRepository;
    @Mock private DeptRepository departementRepository;
    @Mock private AuthAccountClient authAccountClient;
    @InjectMocks private UnifiedProfileService service;

    // ==================== helpers ====================

    private Enseignant enseignant(String id) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setNom("Nom" + id);
        e.setPrenom("Prenom" + id);
        e.setMail(id + "@esprit.tn");
        e.setUserId("user-" + id);
        e.setGrade("MCF");
        e.setSpecialite("Info");
        e.setTelephone("20000000");
        e.setPhotoUrl("http://photo/" + id);
        e.setType("P");
        e.setEtat("A");
        e.setCup("N");
        e.setChefDepartement("N");
        e.setDateRecrutement(LocalDate.of(2020, Month.JANUARY, 1));
        e.setDossierStatus("COMPLET");
        e.setDossierNotes("some notes");
        e.setCreatedAt(LocalDateTime.of(2020, 1, 1, 10, 0));
        return e;
    }

    private Enseignant enseignantWithDept(String id, String deptId, String deptLabel) {
        Enseignant e = enseignant(id);
        Dept d = new Dept();
        d.setId(deptId);
        d.setLibelle(deptLabel);
        e.setDept(d);
        return e;
    }

    private Enseignant enseignantWithUp(String id, String upId, String upLabel) {
        Enseignant e = enseignant(id);
        Up u = new Up();
        u.setId(upId);
        u.setLibelle(upLabel);
        e.setUp(u);
        return e;
    }

    private CurrentUser adminUser() {
        return new CurrentUser("admin", "user-admin", "admin@esprit.tn", Set.of("ADMIN"));
    }

    private CurrentUser chefDeptUser(String userId, String email) {
        return new CurrentUser("chef", userId, email, Set.of("CHEF_DEPARTEMENT"));
    }

    private CurrentUser ensignantUser() {
        return new CurrentUser("ens", "user-ens", "ens@esprit.tn", Set.of("ENSEIGNANT"));
    }

    // ==================== buildPageable branches ====================

    @Test
    void getUnifiedProfiles_nullFilter_usesDefaults() {
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(null, adminUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedFilters_negativePage() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setPage(-1);
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedFilters_nullPageAndSize() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setPage(null);
        filter.setSize(null);
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedFilters_sizeExceedsMax() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setSize(500);
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedFilters_invalidSortBy() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setSortBy("DROP TABLE");
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedFilters_validSortBy() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setSortBy("grade");
        filter.setSortDirection("DESC");
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedFilters_invalidSortDirection() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setSortDirection("UP");
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    // ==================== resolveAccountUserIdFilter ====================

    @Test
    void getUnifiedProfiles_activeFilter() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setIsActive(true);
        AccountSummaryDTO account = new AccountSummaryDTO();
        account.setUserId("user-1");
        account.setRole("ENSEIGNANT");
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of(account));
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedProfiles_activeFilterReturnsEmptyIds() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setIsActive(false);
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of());

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getUnifiedProfiles_accountFilterWithNullUserId() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setRole("ADMIN");
        AccountSummaryDTO account = new AccountSummaryDTO();
        account.setUserId(null);
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of(account));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result).isNotNull();
    }

    // ==================== resolveAllowedDepartements ====================

    @Test
    void getUnifiedProfiles_nullCurrent() {
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), null);

        assertThat(result).isNotNull();
    }

    @Test
    void getUnifiedProfiles_enseignantScope_noRestriction() {
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), ensignantUser());

        assertThat(result).isNotNull();
    }

    @Test
    void getDepartements_departmentScopedByUserId() {
        CurrentUser chef = chefDeptUser("user-chef", "chef@esprit.tn");
        Enseignant fiche = enseignantWithDept("E001", "D1", "Info");
        when(enseignantRepository.findByUserId("user-chef")).thenReturn(Optional.of(fiche));

        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Info");
        when(departementRepository.findAllById(List.of("D1"))).thenReturn(List.of(dept));

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("D1");
    }

    @Test
    void getDepartements_departmentScopedByEmail_fallback() {
        CurrentUser chef = chefDeptUser(null, "chef@esprit.tn");
        Enseignant fiche = enseignantWithDept("E001", "D1", "Info");
        when(enseignantRepository.findByMailIgnoreCase("chef@esprit.tn")).thenReturn(Optional.of(fiche));

        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Info");
        when(departementRepository.findAllById(List.of("D1"))).thenReturn(List.of(dept));

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).hasSize(1);
    }

    @Test
    void getDepartements_departmentScoped_noDeptFound_usesSentinel() {
        CurrentUser chef = chefDeptUser("user-chef", "chef@esprit.tn");
        when(enseignantRepository.findByUserId("user-chef")).thenReturn(Optional.empty());
        when(enseignantRepository.findByMailIgnoreCase("chef@esprit.tn")).thenReturn(Optional.empty());

        // The sentinel __NO_DEPARTMENT__ will cause an empty result from findAllById
        when(departementRepository.findAllById(any())).thenReturn(List.of());

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).isEmpty();
    }

    @Test
    void getDepartements_departmentScoped_ficheHasNoDept() {
        CurrentUser chef = chefDeptUser("user-chef", "chef@esprit.tn");
        Enseignant fiche = enseignant("E001");
        // no dept set
        when(enseignantRepository.findByUserId("user-chef")).thenReturn(Optional.of(fiche));
        when(departementRepository.findAllById(any())).thenReturn(List.of());

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).isEmpty();
    }

    @Test
    void getDepartements_departmentScoped_bothUserIdAndEmailBlank() {
        CurrentUser chef = new CurrentUser("chef", "", "", Set.of("CHEF_DEPARTEMENT"));
        when(departementRepository.findAllById(any())).thenReturn(List.of());

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).isEmpty();
    }

    // ==================== enrichAndMap / toDto ====================

    @Test
    void getUnifiedProfiles_withDeptAndUp() {
        Enseignant e = enseignantWithDept("E001", "D1", "Info");
        Up up = new Up();
        up.setId("UP1");
        up.setLibelle("UP Info");
        e.setUp(up);

        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(e)));
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of());

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), adminUser());

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getDepartement()).isEqualTo("Info");
        assertThat(result.getContent().get(0).getUp()).isEqualTo("UP Info");
    }

    @Test
    void getUnifiedProfiles_fetchAccountsException_gracefulDegradation() {
        Enseignant e = enseignant("E001");
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(e)));
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenThrow(new RuntimeException("Feign unavailable"));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), adminUser());

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRole()).isNull();
    }

    @Test
    void getUnifiedProfiles_fetchAccountsDuplicateUserIds() {
        Enseignant e1 = enseignant("E001");
        e1.setUserId("user-1");
        Enseignant e2 = enseignant("E002");
        e2.setUserId("user-1"); // duplicate
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(e1, e2)));
        AccountSummaryDTO account = new AccountSummaryDTO();
        account.setUserId("user-1");
        account.setRole("ADMIN");
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of(account));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), adminUser());

        assertThat(result.getContent()).hasSize(2);
    }

    // ==================== buildCsv ====================

    @Test
    void exportCsv_withNullValues() {
        Enseignant e = enseignant("E001");
        e.setGrade(null);
        e.setSpecialite(null);
        e.setTelephone(null);
        e.setPhotoUrl(null);
        e.setDateRecrutement(null);
        e.setDossierStatus(null);
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(e));

        byte[] csv = service.exportCsv(new AdvancedFilterRequest(), adminUser());

        String content = new String(csv, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(content).contains("Matricule;Nom;Prenom");
    }

    @Test
    void exportCsv_withSemicolonInValue() {
        Enseignant e = enseignant("E001");
        e.setNom("Ali;Ben");
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(e));

        byte[] csv = service.exportCsv(new AdvancedFilterRequest(), adminUser());

        String content = new String(csv, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(content).contains("\"Ali;Ben\"");
    }

    @Test
    void exportCsv_withNewlineInValue() {
        Enseignant e = enseignant("E001");
        e.setNom("Ali\nBen");
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(e));

        byte[] csv = service.exportCsv(new AdvancedFilterRequest(), adminUser());

        String content = new String(csv, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(content).contains("\"Ali\nBen\"");
    }

    @Test
    void exportCsv_withQuoteInValue() {
        Enseignant e = enseignant("E001");
        e.setNom("Ali\"Ben");
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(e));

        byte[] csv = service.exportCsv(new AdvancedFilterRequest(), adminUser());

        String content = new String(csv, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(content).contains("Ali\"\"Ben");
    }

    @Test
    void exportCsv_maxExportTruncation() {
        List<Enseignant> many = new java.util.ArrayList<>();
        for (int i = 0; i < 100; i++) {
            many.add(enseignant("E" + i));
        }
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(many);

        byte[] csv = service.exportCsv(new AdvancedFilterRequest(), adminUser());

        assertThat(csv).isNotNull();
    }

    @Test
    void exportCsv_nullFilter() {
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of());

        byte[] csv = service.exportCsv(null, adminUser());

        String content = new String(csv, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(content).contains("Matricule");
    }

    // ==================== resolveActiveLabel via toDto ====================

    @Test
    void getUnifiedProfiles_accountActiveTrue() {
        Enseignant e = enseignant("E001");
        AccountSummaryDTO account = new AccountSummaryDTO();
        account.setUserId("user-E001");
        account.setRole("ENSEIGNANT");
        account.setActive(true);
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(e)));
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of(account));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), adminUser());

        assertThat(result.getContent().get(0).getIsActive()).isTrue();
    }

    @Test
    void getUnifiedProfiles_accountActiveFalse() {
        Enseignant e = enseignant("E001");
        AccountSummaryDTO account = new AccountSummaryDTO();
        account.setUserId("user-E001");
        account.setRole("ENSEIGNANT");
        account.setActive(false);
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(e)));
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of(account));

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), adminUser());

        assertThat(result.getContent().get(0).getIsActive()).isFalse();
    }

    @Test
    void getUnifiedProfiles_noAccount() {
        Enseignant e = enseignant("E001");
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(e)));
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class)))
                .thenReturn(List.of());

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(new AdvancedFilterRequest(), adminUser());

        assertThat(result.getContent().get(0).getIsActive()).isNull();
        assertThat(result.getContent().get(0).isAccountLinked()).isFalse();
    }

    // ==================== getDepartements global scope ====================

    @Test
    void getDepartements_globalScope() {
        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Info");
        when(departementRepository.findAll()).thenReturn(List.of(dept));

        List<DeptDTO> result = service.getDepartements(adminUser());

        assertThat(result).hasSize(1);
    }

    // ==================== getGrades ====================

    @Test
    void getGrades() {
        when(enseignantRepository.findDistinctGrades()).thenReturn(List.of("MCF", "PR", "A"));

        List<String> grades = service.getGrades();

        assertThat(grades).containsExactly("MCF", "PR", "A");
    }

    // ==================== csv method branches ====================

    @Test
    void exportCsv_withNullMatricule() {
        Enseignant e = enseignant("E001");
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(e));

        byte[] csv = service.exportCsv(new AdvancedFilterRequest(), adminUser());

        assertThat(csv).isNotNull();
    }

    @Test
    void exportCsv_csvBomPresent() {
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of());

        byte[] csv = service.exportCsv(new AdvancedFilterRequest(), adminUser());

        // UTF-8 BOM: 0xEF 0xBB 0xBF
        assertThat(csv[0]).isEqualTo((byte) 0xEF);
        assertThat(csv[1]).isEqualTo((byte) 0xBB);
        assertThat(csv[2]).isEqualTo((byte) 0xBF);
    }

    // ==================== resolveChefDeptIds branches ====================

    @Test
    void resolveChefDeptIds_blankUserId_fallbackToEmail() {
        CurrentUser chef = chefDeptUser("  ", "chef@esprit.tn");
        Enseignant fiche = enseignantWithDept("E001", "D1", "Info");
        when(enseignantRepository.findByMailIgnoreCase("chef@esprit.tn")).thenReturn(Optional.of(fiche));

        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Info");
        when(departementRepository.findAllById(List.of("D1"))).thenReturn(List.of(dept));

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).hasSize(1);
    }

    @Test
    void resolveChefDeptIds_bothBlank() {
        CurrentUser chef = new CurrentUser("chef", "", "", Set.of("CHEF_DEPARTEMENT"));
        when(departementRepository.findAllById(any())).thenReturn(List.of());

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).isEmpty();
    }
}

