package tn.esprit.d2f.dto;

import java.io.Serializable;

/** Compteur de notifications non lues (badge du centre de notifications). */
public record NotificationCountResponse(long total, long unread) implements Serializable {
}
