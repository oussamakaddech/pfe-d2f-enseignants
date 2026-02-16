package esprit.pfe.serviceformation.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor

public class CountByTrainerTypeWithIdsDTO {
        private Long externeOnlyCount;
        private Long interneOnlyCount;
        private Long mixteCount;

        private List<Long> externeOnlyIds;
        private List<Long> interneOnlyIds;
        private List<Long> mixteIds;
}
