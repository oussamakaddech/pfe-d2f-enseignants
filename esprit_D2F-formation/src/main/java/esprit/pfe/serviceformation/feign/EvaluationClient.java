package esprit.pfe.serviceformation.feign;


import esprit.pfe.serviceformation.DTO.EvaluationFormateurDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "evaluation-service", contextId = "evaluationClient")
public interface EvaluationClient {

    @PostMapping("/evaluations/bulk")
    void createEvaluationsBulk(@RequestBody List<EvaluationFormateurDTO> dtos);
}
