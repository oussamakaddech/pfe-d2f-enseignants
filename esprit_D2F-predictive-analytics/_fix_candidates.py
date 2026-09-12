"""Script temporaire : injecte training_corpus_provenanced.csv en premier dans le predicteur."""
p = "app/infrastructure/ml/predictor.py"
s = open(p, encoding="utf-8").read()

old = (
    '        candidates = [\n'
    '            base_dir / "training_corpus_from_db.csv",\n'
    '            base_dir / "training_corpus.csv",\n'
    '        ]'
)
new = (
    '        candidates = [\n'
    '            base_dir / "training_corpus_provenanced.csv",\n'
    '            base_dir / "training_corpus_from_db.csv",\n'
    '            base_dir / "training_corpus.csv",\n'
    '        ]'
)
assert s.count(old) == 1, "occurrences=" + str(s.count(old))
s2 = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s2)
print("remplace OK ; provenanced present =", "training_corpus_provenanced.csv" in s2)
