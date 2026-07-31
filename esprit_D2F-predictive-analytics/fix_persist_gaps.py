"""Fix _persist_gaps to incorporate current_level into gap_score calculation."""
import pathlib

p = pathlib.Path('app/routers/analytics.py')
content = p.read_text(encoding='utf-8')

old = '''        base = _knowledge_difficulty_score(diff)
        type_weight = GAP_TYPE_WEIGHTS.get(gap_type, 0.5)
        assignment_penalty = 0.0 if assignment == "NOT_ASSIGNED" else 0.15

        gap_score = round(min(1.0, base * type_weight + assignment_penalty), 4)
        impact_score = round(gap_score * 0.8, 4)
        urgence_score = round(gap_score * 0.6, 4)
        niveau_urgence = classify_priority(gap_score)'''

new = '''        current = d.get("current_level", 0)
        base = _knowledge_difficulty_score(diff)
        type_weight = GAP_TYPE_WEIGHTS.get(gap_type, 0.5)
        assignment_penalty = 0.0 if assignment == "NOT_ASSIGNED" else 0.15

        # Adjust gap score based on the teacher's actual current_level.
        # A teacher with partial coverage (level < required) should have a
        # lower gap score than one with no coverage at all.
        if current > 0 and current < diff:
            level_gap = (diff - current) / max(diff, 1)
            gap_score = round(min(1.0, base * type_weight * level_gap + assignment_penalty), 4)
        else:
            gap_score = round(min(1.0, base * type_weight + assignment_penalty), 4)
        impact_score = round(gap_score * 0.8, 4)
        urgence_score = round(gap_score * 0.6, 4)
        niveau_urgence = classify_priority(gap_score)'''

if old in content:
    content = content.replace(old, new)
    print('Fix applied successfully')
else:
    print('Fix NOT found - checking for partial matches')
    for i, line in enumerate(content.split('\n')):
        if 'base = _knowledge_difficulty_score(diff)' in line:
            # Found the line, let's check what's nearby
            ctx = '\n'.join(content.split('\n')[i:i+10])
            print(f'Found at line {i+1}:')
            print(repr(ctx))

p.write_text(content, encoding='utf-8')
print('File saved')