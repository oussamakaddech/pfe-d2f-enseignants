package tn.esprit.d2f.controller;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.BesoinFormationRequest;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.IBesoinFormationService;

import java.util.List;

@Slf4j
@RestController
@AllArgsConstructor
@RequestMapping("/besoinsFormations")
public class BesoinFormationController {

    @Autowired
    IBesoinFormationService besoinFormationService ;

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping("/retrieve-all-BesoinFormations")
    public List<BesoinFormation> getBesoinFormations() {
        List<BesoinFormation> listBesoinFormations = besoinFormationService.retrieveAllBesoinFormations() ;
        return listBesoinFormations ;
    }

    @GetMapping("/retrieve-BesoinFormation/{idBesoinFormation}")
    public BesoinFormation retrieveBesoinFormation(@PathVariable("idBesoinFormation") long idBesoinFormation) {
        BesoinFormation  BesoinFormation=besoinFormationService.retrieveBesoinFormation(idBesoinFormation) ;
        return BesoinFormation ;
    }


    @PostMapping("/add-BesoinFormation")
    public BesoinFormation addBesoinFormation(@RequestBody BesoinFormation b) {
        BesoinFormation BesoinFormation=besoinFormationService.addBesoinFormation(b) ;
        return BesoinFormation ;
    }

    @DeleteMapping("/remove-BesoinFormation/{idBesoinFormation}")
    public void removeBesoinFormation(@PathVariable("idBesoinFormation") long idBesoinFormation) {
        besoinFormationService.removeBesoinFormation(idBesoinFormation);
    }

    @PutMapping("/modify-BesoinFormation")
    public BesoinFormation modifyBesoinFormation(@RequestBody BesoinFormationRequest request) {
        return besoinFormationService.modifyBesoinFormation(
                request.getBesoinFormation(),
                request.getCommentaire()
        );
    }


    @GetMapping("/notifications/{username}")
    public List<Notification> getUserNotifications(@PathVariable String username) {
        return notificationRepository.findByUsername(username);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<BesoinFormation> approveBesoin(@PathVariable Long id) {
        BesoinFormation b = besoinFormationService.approuverBesoin(id);
        return ResponseEntity.ok(b);
    }
    @GetMapping("/retrieve-approved-BesoinFormations")
    public List<BesoinFormation> getApprovedBesoinFormations() {
        return besoinFormationService.retrieveApprovedBesoinFormations();
    }

}
