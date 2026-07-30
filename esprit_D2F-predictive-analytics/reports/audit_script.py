#!/usr/bin/env python3
"""Audit script for D2F predictive analytics service personalization."""

import json
import csv
from collections import defaultdict
from pathlib import Path

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://d2f:d2f123@localhost:5432/d2f"

def load_clean_data():
    """Load all clean CSV data."""
    base = Path("/app/data/clean")
    teachers = pd.read_csv(base / "teachers.csv")
    competencies = pd.read_csv(base / "teacher_competencies.csv")
    risk_scores = pd.read_csv(base / "risk_scores.csv")
    alerts = pd.read_csv(base / "alerts.csv")
    recommendations = pd.read_csv(base / "recommendations.csv")
    formations = pd.read_csv(base / "formations.csv") if (base / "formations.csv").exists() else None
    return teachers, competencies, risk_scores, alerts, recommendations, formations

def audit_teacher_diversity(teachers_df, competencies_df):
    """Audit teacher diversity."""
    results = {}
    
    # Basic counts
    results["n_teachers"] = len(teachers_df)
    results["n_departments"] = teachers_df["department_code"].nunique()
    results["n_ups"] = teachers_df["up_code"].nunique()
    
    # Department distribution
    dept_dist = teachers_df.groupby("department_code").size().to_dict()
    results["department_distribution"] = dept_dist
    
    # UP distribution
    up_dist = teachers_df.groupby("up_code").size().to_dict()
    results["up_distribution"] = up_dist
    
    # Competencies per teacher
    comp_per_teacher = competencies_df.groupby("teacher_id").size().to_dict()
    results["competencies_per_teacher"] = comp_per_teacher
    
    # Teachers missing competency data
    teachers_with_comp = set(competencies_df["teacher_id"].unique())
    all_teachers = set(teachers_df["teacher_id"].unique())
    missing_comp = all_teachers - teachers_with_comp
    results["missing_competency_data"] = list(missing_comp)
    
    # Current level variance
    current_levels = competencies_df["current_level"].value_counts().to_dict()
    results["current_level_distribution"] = {str(k): v for k, v in current_levels.items()}
    
    # Required level variance
    required_levels = competencies_df["required_level"].value_counts().to_dict()
    results["required_level_distribution"] = {str(k): v for k, v in required_levels.items()}
    
    # Gap distribution
    gap_dist = competencies_df["gap_value"].value_counts().to_dict()
    results["gap_distribution"] = {str(k): v for k, v in gap_dist.items()}
    
    # Critical gaps
    critical_count = competencies_df["is_critical_gap"].sum()
    results["n_critical_gaps"] = int(critical_count)
    
    # Profile uniqueness check
    profile_vectors = competencies_df.groupby("teacher_id").apply(
        lambda x: tuple(sorted(zip(x["competence_code"], x["current_level"], x["required_level"]))),
        include_groups=False
    ).to_dict()
    
    unique_profiles = len(set(profile_vectors.values()))
    results["unique_profiles"] = unique_profiles
    results["profile_diversity_ratio"] = unique_profiles / len(profile_vectors)
    
    return results

def audit_recommendation_diversity(recs_df, formations_df):
    """Audit recommendation diversity."""
    results = {}
    
    # Total recommendations
    results["total_recommendations"] = len(recs_df)
    
    # Unique trainings recommended
    unique_trainings = recs_df["training_code"].nunique()
    results["unique_trainings_recommended"] = unique_trainings
    
    # Trainings per teacher
    trainings_per_teacher = recs_df.groupby("teacher_id").size().to_dict()
    results["trainings_per_teacher"] = trainings_per_teacher
    
    # Top-1 concentration
    top1 = recs_df.groupby("teacher_id").first().reset_index()
    top1_counts = top1["training_code"].value_counts()
    results["top1_concentration"] = (top1_counts.iloc[0] / len(top1) * 100) if len(top1) > 0 else 0
    results["top1_training"] = top1_counts.index[0] if len(top1) > 0 else None
    
    # Top-3 concentration (exact match)
    top3_lists = recs_df.groupby("teacher_id").apply(
        lambda x: tuple(sorted(x["training_code"].tolist())),
        include_groups=False
    ).to_dict()
    
    list_counts = defaultdict(int)
    for lst in top3_lists.values():
        list_counts[lst] += 1
    
    max_dup = max(list_counts.values())
    results["top3_max_duplicates"] = max_dup
    results["top3_duplicate_percentage"] = max_dup / len(top3_lists) * 100
    
    # Catalog coverage
    if formations_df is not None:
        total_formations = len(formations_df)
        results["catalog_coverage"] = unique_trainings / total_formations if total_formations > 0 else 0
    
    # Gap traceability
    gap_coverage = recs_df["target_competency_code"].notna().sum()
    results["recommendations_with_target_competency"] = int(gap_coverage)
    
    return results

def audit_gap_personalization(teachers_df, competencies_df):
    """Check if gaps are teacher-specific."""
    results = {}
    
    # Check for duplicate gap lists
    gap_lists = competencies_df.groupby("teacher_id").apply(
        lambda x: tuple(sorted(zip(x["competence_code"], x["gap_value"]))),
        include_groups=False
    ).to_dict()
    
    list_counts = defaultdict(int)
    for lst in gap_lists.values():
        list_counts[lst] += 1
    
    max_dup = max(list_counts.values()) if list_counts else 0
    results["max_duplicate_gap_lists"] = max_dup
    results["gap_list_diversity_ratio"] = len(set(gap_lists.values())) / len(gap_lists) if gap_lists else 0
    
    # Teachers with gaps
    teachers_with_gaps = [tid for tid, lst in gap_lists.items() if any(g[1] > 0 for g in lst)]
    results["teachers_with_gaps"] = len(teachers_with_gaps)
    
    return results

def run_audit():
    """Run full audit."""
    teachers_df, competencies_df, risk_scores_df, alerts_df, recs_df, formations_df = load_clean_data()
    
    audit = {
        "teacher_diversity": audit_teacher_diversity(teachers_df, competencies_df),
        "recommendation_diversity": audit_recommendation_diversity(recs_df, formations_df),
        "gap_personalization": audit_gap_personalization(teachers_df, competencies_df),
    }
    
    return audit

if __name__ == "__main__":
    audit = run_audit()
    print(json.dumps(audit, indent=2))