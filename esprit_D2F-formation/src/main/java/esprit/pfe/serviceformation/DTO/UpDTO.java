package esprit.pfe.serviceformation.dto;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class UpDTO implements Serializable {
    private String id;
    private String libelle;
}
