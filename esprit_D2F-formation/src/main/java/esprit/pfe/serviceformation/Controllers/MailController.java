package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.Microsoft.OutlookMailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mail")
public class MailController {

    @Autowired
    private OutlookMailService mailService;

    @PostMapping("/send")
    public ResponseEntity<String> sendEmail(
            @RequestParam String to,
            @RequestParam String subject,
            @RequestParam String content
    ) {
        mailService.sendMail(to, subject, content);
        return ResponseEntity.ok("E-mail envoyé à " + to);
    }
}

