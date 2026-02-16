package tn.esprit.d2f.controller;

import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.entity.UserCompetence;
import tn.esprit.d2f.service.UserCompetenceService;

import java.util.List;

@RestController
@RequestMapping("/user-competence")
@AllArgsConstructor
public class UserCompetenceController {

    @Autowired
    UserCompetenceService userCompetenceService;

    @PostMapping("/add/{userId}/{competenceId}")
    public ResponseEntity<UserCompetence> addCompetenceToUser(
            @PathVariable String userId, @PathVariable Long competenceId) {
        return ResponseEntity.ok(userCompetenceService.addCompetenceToUser(userId, competenceId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<UserCompetence>> getUserCompetences(@PathVariable String userId) {
        return ResponseEntity.ok(userCompetenceService.getUserCompetences(userId));
    }
}
