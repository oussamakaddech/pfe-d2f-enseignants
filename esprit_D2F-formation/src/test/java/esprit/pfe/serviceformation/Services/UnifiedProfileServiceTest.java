package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.common.PageResponse;
import esprit.pfe.serviceformation.dto.AccountSummaryDTO;
import esprit.pfe.serviceformation.dto.AccountSummaryRequest;
import esprit.pfe.serviceformation.dto.AdvancedFilterRequest;
import esprit.pfe.serviceformation.dto.DeptDTO;
import esprit.pfe.serviceformation.dto.UnifiedProfileDTO;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.feign.AuthAccountClient;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnifiedProfileServiceTest {

    @Mock private EnseignantRepository enseignantRepository;
    @Mock private DeptRepository departementRepository;
    @Mock private AuthAccountClient authAccountClient;
    @InjectMocks private UnifiedProfileService service;

    @Captor private ArgumentCaptor<Specification<Enseignant>> specCaptor;

    private Enseignant enseignant(String id, String nom, String prenom, String deptId, String deptLabel) {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setNom(nom);
        e.setPrenom(prenom);
        e.setMail(id + "@esprit.tn");
        e.setUserId("user-" + id);
        e.setGrade("MCF");
        if (deptId != null) {
            Dept d = new Dept();
            d.setId(deptId);
            d.setLibelle(deptLabel);
            e.setDept(d);
        }
        return e;
    }

    private CurrentUser adminUser() {
        return new CurrentUser("admin", "user-admin", "admin@esprit.tn", Set.of("ADMIN"));
    }

    private CurrentUser chefDeptUser(String userId, String email, String deptId) {
        Enseignant fiche = new Enseignant();
        fiche.setId("E001");
        fiche.setUserId(userId);
        fiche.setMail(email);
        if (deptId != null) {
            Dept d = new Dept();
            d.setId(deptId);
            fiche.setDept(d);
        }
        when(enseignantRepository.findByUserId(userId)).thenReturn(Optional.of(fiche));
        return new CurrentUser("chef", userId, email, Set.of("CHEF_DEPARTEMENT"));
    }

    @Test
    void getUnifiedProfiles_noFilter() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        Enseignant e1 = enseignant("E001", "Ali", "Ben", "D1", "Info");
        Page<Enseignant> page = new PageImpl<>(List.of(e1));
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNom()).isEqualTo("Ali");
    }

    @Test
    void getUnifiedProfiles_nullFilterUsesDefaults() {
        Enseignant e1 = enseignant("E001", "Ali", "Ben", null, null);
        Page<Enseignant> page = new PageImpl<>(List.of(e1));
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(null, adminUser());

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getUnifiedProfiles_accountFilterReturnsEmpty() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setRole("ENSEIGNANT");
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class))).thenReturn(List.of());

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getUnifiedProfiles_withAccountFilter() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setRole("ENSEIGNANT");
        AccountSummaryDTO account = new AccountSummaryDTO();
        account.setUserId("user-E001");
        account.setRole("ENSEIGNANT");
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class))).thenReturn(List.of(account));
        Enseignant e1 = enseignant("E001", "Ali", "Ben", null, null);
        Page<Enseignant> page = new PageImpl<>(List.of(e1));
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, adminUser());

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getDepartements_globalScope() {
        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Info");
        when(departementRepository.findAll()).thenReturn(List.of(dept));

        List<DeptDTO> result = service.getDepartements(adminUser());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("D1");
    }

    @Test
    void getDepartements_departmentScoped() {
        CurrentUser chef = chefDeptUser("user-chef", "chef@esprit.tn", "D1");
        Dept dept = new Dept();
        dept.setId("D1");
        dept.setLibelle("Info");
        when(departementRepository.findAllById(List.of("D1"))).thenReturn(List.of(dept));

        List<DeptDTO> result = service.getDepartements(chef);

        assertThat(result).hasSize(1);
    }

    @Test
    void getGrades() {
        when(enseignantRepository.findDistinctGrades()).thenReturn(List.of("MCF", "PR"));

        List<String> grades = service.getGrades();

        assertThat(grades).containsExactly("MCF", "PR");
    }

    @Test
    void exportCsv_basic() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        Enseignant e1 = enseignant("E001", "Ali", "Ben", "D1", "Info");
        when(enseignantRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(e1));

        byte[] csv = service.exportCsv(filter, adminUser());

        String content = new String(csv, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(content).contains("Matricule;Nom;Prenom", "E001;Ali");
    }

    @Test
    void exportCsv_emptyAccountFilter() {
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        filter.setRole("ENSEIGNANT");
        when(authAccountClient.getAccountSummaries(any(AccountSummaryRequest.class))).thenReturn(List.of());

        byte[] csv = service.exportCsv(filter, adminUser());

        String content = new String(csv, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(content).contains("Matricule;Nom;Prenom");
    }

    @Test
    void resolveChefDeptIds_noDeptUsesSentinel() {
        CurrentUser chef = chefDeptUser("user-chef", "chef@esprit.tn", null);
        AdvancedFilterRequest filter = new AdvancedFilterRequest();
        Page<Enseignant> emptyPage = new PageImpl<>(List.of());
        when(enseignantRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);

        PageResponse<UnifiedProfileDTO> result = service.getUnifiedProfiles(filter, chef);

        assertThat(result).isNotNull();
    }
}
