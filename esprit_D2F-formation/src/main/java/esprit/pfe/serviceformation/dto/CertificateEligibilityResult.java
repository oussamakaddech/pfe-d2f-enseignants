package esprit.pfe.serviceformation.dto;

import java.util.List;

public record CertificateEligibilityResult(boolean eligible, List<String> reasons) {
}