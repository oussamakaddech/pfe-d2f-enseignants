package tn.esprit.d2f.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.mapper.BesoinFormationMapper;
import tn.esprit.d2f.repository.BesoinFormationRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BesoinFormationServiceImplTest {

    @Mock
    private BesoinFormationRepository besoinFormationRepository;

    @Mock
    private BesoinFormationMapper besoinFormationMapper;

    @InjectMocks
    private BesoinFormationServiceImpl besoinFormationService;

    private BesoinFormation entity;
    private BesoinFormationRequest request;
    private BesoinFormationResponse response;

    @BeforeEach
    void setUp() {
        entity = new BesoinFormation();
        ReflectionTestUtils.setField(entity, "idBesoinFormation", 1L);
        entity.setTitre("Test Titre");

        request = new BesoinFormationRequest();
        request.setTitre("Test Titre");

        response = new BesoinFormationResponse();
        response.setIdBesoinFormation(1L);
        response.setTitre("Test Titre");
    }

    @Test
    @DisplayName("Add Besoin - Success")
    void addBesoin_Success() {
        when(besoinFormationMapper.toEntity(any(BesoinFormationRequest.class))).thenReturn(entity);
        when(besoinFormationRepository.save(any(BesoinFormation.class))).thenReturn(entity);
        when(besoinFormationMapper.toResponse(any(BesoinFormation.class))).thenReturn(response);

        BesoinFormationResponse result = besoinFormationService.addBesoinFormation(request);

        assertThat(result).isNotNull();
        assertThat(result.getTitre()).isEqualTo("Test Titre");
        verify(besoinFormationRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("Retrieve by ID - Success")
    void retrieveById_Success() {
        when(besoinFormationRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(besoinFormationMapper.toResponse(entity)).thenReturn(response);

        BesoinFormationResponse result = besoinFormationService.retrieveBesoinFormation(1L);

        assertThat(result).isNotNull();
        assertThat(result.getIdBesoinFormation()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Retrieve by ID - NotFound")
    void retrieveById_NotFound() {
        when(besoinFormationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> besoinFormationService.retrieveBesoinFormation(99L))
                .isInstanceOf(RuntimeException.class);
    }
}
