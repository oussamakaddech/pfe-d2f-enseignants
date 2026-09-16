package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.AuthUserResponse;
import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.dto.EnseignantWithAccountRequest;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.feign.AuthAccountWriteClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnseignantAccountServiceTest {

    @Mock private AuthAccountWriteClient authAccountWriteClient;
    @Mock private EnseignantService enseignantService;
    @InjectMocks private EnseignantAccountService service;

    @Test
    void createEnseignantWithAccountSuccess() {
        AuthUserResponse account = new AuthUserResponse();
        account.setId("user123");
        when(authAccountWriteClient.createAccount(anyString(), any(), anyString())).thenReturn(account);
        when(enseignantService.linkOrCreateEnseignant(any())).thenReturn(new Enseignant());
        when(enseignantService.toDTO(any())).thenReturn(new EnseignantDTO());

        EnseignantDTO result = service.createEnseignantWithAccount(new EnseignantWithAccountRequest(), "ENSEIGNANT", "Bearer token");

        assertThat(result).isNotNull();
        verify(authAccountWriteClient).createAccount(anyString(), any(), anyString());
        verify(enseignantService).linkOrCreateEnseignant(any());
    }

    @Test
    void createEnseignantWithAccountThrowsWhenNoUserIdReturned() {
        AuthUserResponse account = new AuthUserResponse();
        account.setId(null);
        when(authAccountWriteClient.createAccount(anyString(), any(), anyString())).thenReturn(account);

        EnseignantWithAccountRequest request = new EnseignantWithAccountRequest();
        assertThatThrownBy(() -> service.createEnseignantWithAccount(request, "ENSEIGNANT", "Bearer token"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("aucun identifiant");
    }

    @Test
    void createEnseignantWithAccountCompensatesOnFailure() {
        AuthUserResponse account = new AuthUserResponse();
        account.setId("user123");
        when(authAccountWriteClient.createAccount(anyString(), any(), anyString())).thenReturn(account);
        when(enseignantService.linkOrCreateEnseignant(any())).thenThrow(new RuntimeException("DB error"));

        EnseignantWithAccountRequest request = new EnseignantWithAccountRequest();
        assertThatThrownBy(() -> service.createEnseignantWithAccount(request, "ENSEIGNANT", "Bearer token"))
                .isInstanceOf(RuntimeException.class);

        verify(authAccountWriteClient).deleteAccount("Bearer token", "user123");
    }
}