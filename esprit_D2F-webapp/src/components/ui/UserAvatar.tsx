import { memo, useMemo } from "react";
import { Avatar } from "antd";

interface UserAvatarProps {
  readonly firstName?: string;
  readonly lastName?: string;
  /** Repli si prénom/nom absents (email, username…). */
  readonly fallbackText?: string;
  readonly photoUrl?: string;
  /** Diamètre en px — afficher au max 40px dans les listes. */
  readonly size?: number;
  readonly className?: string;
}

/** Palette d'arrière-plans dérivée du nom (stable pour une même personne). */
const AVATAR_COLORS = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-info)",
  "#7c3aed",
  "var(--color-primary-light)",
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Avatar utilisateur avec repli en initiales colorées (prenom[0] + nom[0]).
 * Les photos sont lazy-loadées et recadrées en object-fit: cover.
 */
const UserAvatar = memo(function UserAvatar({
  firstName,
  lastName,
  fallbackText,
  photoUrl,
  size = 40,
  className,
}: UserAvatarProps) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim() || (fallbackText ?? "");

  const initials = useMemo(() => {
    const fromNames = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
    if (fromNames) return fromNames;
    return (fallbackText ?? "?").slice(0, 2).toUpperCase();
  }, [firstName, lastName, fallbackText]);

  const background = AVATAR_COLORS[hashString(name || initials) % AVATAR_COLORS.length];

  if (photoUrl) {
    return (
      <Avatar
        className={className}
        size={size}
        src={photoUrl}
        alt={name}
        imgProps={{ loading: "lazy", style: { objectFit: "cover" } }}
      />
    );
  }

  return (
    <Avatar
      className={className}
      size={size}
      alt={name}
      style={{ background, fontWeight: 600, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </Avatar>
  );
});

export default UserAvatar;
