"""Inspection rapide des datasets."""
import pandas as pd

# Check v1.0.0 corpus
df = pd.read_csv("data/clean/training_corpus_from_db.csv")
print("v1.0.0 corpus:")
print(f"  rows={len(df)}, cols={len(df.columns)}")
print(f"  teachers={df['teacher_id'].nunique()}")
print(f"  competencies={df['competence_id'].nunique()}")
print(f"  columns={list(df.columns)}")
print()

# Check synthetic corpus
df2 = pd.read_csv("data/clean/training_corpus.csv")
print("synthetic corpus:")
print(f"  rows={len(df2)}, cols={len(df2.columns)}")
print(f"  teachers={df2['teacher_id'].nunique()}")
print(f"  columns={list(df2.columns)}")
print()

# Check v1.1.0 provenanced
df3 = pd.read_csv("data/clean/training_corpus_provenanced_v110.csv")
print("v1.1.0 provenanced:")
print(f"  rows={len(df3)}, cols={len(df3.columns)}")
print(f"  teachers={df3['teacher_id'].nunique()}")
print(f"  competencies={df3['competence_id'].nunique()}")
print(f"  columns={list(df3.columns)}")
print(f"  source_type={df3['source_type'].unique()}")
print(f"  is_synthetic={df3['is_synthetic'].unique()}")
print(f"  dataset_version={df3['dataset_version'].unique()}")
print(f"  source_id sample={df3['source_id'].head(5).tolist()}")
print()

# Check v1.0.0 provenanced
df4 = pd.read_csv("data/clean/training_corpus_provenanced.csv")
print("v1.0.0 provenanced:")
print(f"  rows={len(df4)}, cols={len(df4.columns)}")
print(f"  teachers={df4['teacher_id'].nunique()}")
print(f"  competencies={df4['competence_id'].nunique()}")
print(f"  columns={list(df4.columns)}")
print(f"  source_type={df4['source_type'].unique()}")
print(f"  is_synthetic={df4['is_synthetic'].unique()}")
print(f"  dataset_version={df4['dataset_version'].unique()}")
print(f"  source_id sample={df4['source_id'].head(5).tolist()}")
print()

# Check v1.1.0 from_db
df5 = pd.read_csv("data/clean/training_corpus_from_db_v110.csv")
print("v1.1.0 from_db:")
print(f"  rows={len(df5)}, cols={len(df5.columns)}")
print(f"  teachers={df5['teacher_id'].nunique()}")
print(f"  competencies={df5['competence_id'].nunique()}")
print(f"  columns={list(df5.columns)}")
print(f"  source_type={df5['source_type'].unique()}")
print(f"  is_synthetic={df5['is_synthetic'].unique()}")
print(f"  dataset_version={df5['dataset_version'].unique()}")
print(f"  source_id sample={df5['source_id'].head(5).tolist()}")
print()

# Check teachers.csv
df6 = pd.read_csv("data/clean/teachers.csv")
print("teachers.csv:")
print(f"  rows={len(df6)}, cols={len(df6.columns)}")
print(f"  columns={list(df6.columns)}")
if "department_code" in df6.columns:
    print(f"  departments={df6['department_code'].unique()}")
if "up_code" in df6.columns:
    print(f"  ups={df6['up_code'].unique()}")
print()

# Check teacher_competencies.csv
df7 = pd.read_csv("data/clean/teacher_competencies.csv")
print("teacher_competencies.csv:")
print(f"  rows={len(df7)}, cols={len(df7.columns)}")
print(f"  columns={list(df7.columns)}")
print(f"  teachers={df7['teacher_id'].nunique()}")
print(f"  competencies={df7['competence_code'].nunique() if 'competence_code' in df7.columns else 'N/A'}")