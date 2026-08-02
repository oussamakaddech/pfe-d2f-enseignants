def same_department(teacher_a, teacher_b) -> bool:
    return bool(teacher_a.dept_id and teacher_b.dept_id and teacher_a.dept_id == teacher_b.dept_id)
