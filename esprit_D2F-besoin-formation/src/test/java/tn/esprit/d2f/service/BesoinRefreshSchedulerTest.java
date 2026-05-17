package tn.esprit.d2f.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.repository.BesoinFormationRepository;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BesoinRefreshSchedulerTest {

    @Mock
    private BesoinFormationRepository repository;

    @InjectMocks
    private BesoinRefreshScheduler scheduler;

    @Test
    void refreshBesoins_updatesLastRefreshDateForAllBesoins() {
        BesoinFormation b1 = new BesoinFormation();
        b1.setIdBesoinFormation(1L);
        BesoinFormation b2 = new BesoinFormation();
        b2.setIdBesoinFormation(2L);

        when(repository.findAll()).thenReturn(List.of(b1, b2));

        scheduler.refreshBesoins();

        ArgumentCaptor<BesoinFormation> captor = ArgumentCaptor.forClass(BesoinFormation.class);
        verify(repository, times(2)).save(captor.capture());

        List<BesoinFormation> saved = captor.getAllValues();
        assertThat(saved)
                .hasSize(2)
                .allSatisfy(b -> assertThat(b.getLastRefreshDate()).isNotNull());
    }

    @Test
    void refreshBesoins_emptyRepository_savesNothing() {
        when(repository.findAll()).thenReturn(Collections.emptyList());

        scheduler.refreshBesoins();

        verify(repository, never()).save(any(BesoinFormation.class));
    }
}
