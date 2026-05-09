package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.microsoft.OutlookMailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/mail")
@RequiredArgsConstructor
public class MailController {
    private final OutlookMailService mailService;

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


