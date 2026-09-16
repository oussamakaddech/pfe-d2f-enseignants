export interface Bureau {
  id: number;
  nom: string;
  email: string;
  numeroTelephone: string;
}

export interface BureauRequest {
  nom: string;
  email: string;
  numeroTelephone: string;
}

export interface AnimateurExterne {
  id: number;
  nom: string;
  prenom: string;
  email?: string | null;
  bureauId: number;
}

export interface AnimateurExterneRequest {
  nom: string;
  prenom: string;
  email?: string | null;
}
