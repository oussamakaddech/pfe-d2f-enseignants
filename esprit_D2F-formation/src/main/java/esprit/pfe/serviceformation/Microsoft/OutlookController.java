package esprit.pfe.serviceformation.Microsoft;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/outlook")
public class OutlookController {

    @Autowired
    private OutlookMailService mailService;

    @Autowired
    private OutlookCalendarService calendarService;

  /*  @GetMapping("/send-mail")
    public ResponseEntity<String> sendMail() {
        // Envoi d'un mail : expéditeur est Application.Formationdesformateurs@Esprit.tn, destinataire est ibtihel.benmustapha@esprit.tn
        mailService.sendMail("ibtihel.benmustapha@esprit.tn", "Test Graph", "Bonjour ! Ceci est un test Microsoft Graph.");
        return ResponseEntity.ok("E-mail envoyé !");
    }

    @GetMapping("/add-event")
    public ResponseEntity<String> addEvent() {
        // Ajout d'un événement dans le calendrier du compte ciblé (ici : ibtihel.benmustapha@esprit.tn)
        OffsetDateTime start = OffsetDateTime.now().plusDays(1).withHour(10).withMinute(0);
        OffsetDateTime end = start.plusHours(2);
        calendarService.addEventToCalendar("ibtihel.benmustapha@esprit.tn", "Réunion test", "Voici un test d’ajout d’événement.", start, end);
        return ResponseEntity.ok("Événement ajouté !");
    }*/
}
