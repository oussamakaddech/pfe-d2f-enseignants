
INSERT INTO users (id, disabled, email, first_name, last_name, password, phone_number, username) VALUES 
('u001', false, 'ens001@esprit.tn', 'Jean', 'Dupont', '.n9p.', '20000001', 'ens001'),
('u002', false, 'ens002@esprit.tn', 'Marie', 'Curie', '.n9p.', '20000002', 'ens002'),
('u003', false, 'ens003@esprit.tn', 'Alan', 'Turing', '.n9p.', '20000003', 'ens003') ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES 
('u001', 7),
('u002', 7),
('u003', 7) ON CONFLICT DO NOTHING;

INSERT INTO enseignants (id, chefdepartement, cup, etat, mail, nom, prenom, type) VALUES 
('ENS001', 'N', 'N', 'A', 'ens001@esprit.tn', 'Dupont', 'Jean', 'P'),
('ENS002', 'N', 'N', 'A', 'ens002@esprit.tn', 'Curie', 'Marie', 'P'),
('ENS003', 'N', 'N', 'A', 'ens003@esprit.tn', 'Turing', 'Alan', 'P') ON CONFLICT DO NOTHING;

INSERT INTO formations (date_debut, date_fin, etat_formation, type_formation, titre_formation, certif_generated, inscriptions_ouvertes, ouverte) VALUES 
('2026-05-10', '2026-05-12', 'NOUVEAU', 'INTERNE', 'Formation Spring Boot Avancé', false, true, true),
('2026-06-01', '2026-06-05', 'PLANIFIE', 'INTERNE', 'Initiation à React et Vite', false, true, true),
('2026-07-15', '2026-07-16', 'NOUVEAU', 'EXTERNE', 'Agilité et Scrum', false, false, false);

