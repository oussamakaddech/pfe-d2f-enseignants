from app.core.exceptions import ForbiddenScopeError, NotFoundError
from app.core.security import CurrentUser
from app.domain.entities.teacher import Teacher
from app.domain.services.teacher_access import same_department


def enforce_teacher_access(user: CurrentUser, teacher: Teacher, user_teacher: Teacher | None) -> None:
    if user.is_admin or user.is_cup:
        return
    if user.is_chef_departement:
        if user_teacher is not None and same_department(teacher, user_teacher):
            return
        raise ForbiddenScopeError(f"Enseignant hors du périmètre du département de {user.username}")
    if user.is_enseignant:
        if user.user_id and teacher.user_id and user.user_id == teacher.user_id:
            return
        raise ForbiddenScopeError("Accès autorisé uniquement à votre propre profil enseignant")
    raise ForbiddenScopeError("Rôle non autorisé à consulter les analyses enseignants")


def resolve_teacher_or_404(teacher_id: str, teacher_source) -> Teacher:
    teacher = teacher_source.get_teacher(teacher_id)
    if teacher is None:
        raise NotFoundError(f"Enseignant {teacher_id} introuvable dans le référentiel formation")
    return teacher
