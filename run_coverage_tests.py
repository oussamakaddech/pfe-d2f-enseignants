"""Run coverage boost tests and save output."""
import subprocess
import sys

result = subprocess.run(
    [sys.executable, "-m", "pytest", "tests/test_coverage_boost.py", "-v", "--tb=short"],
    cwd=r"c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-predictive-analytics",
    capture_output=True,
    text=True,
    timeout=120,
)

with open(r"c:/Users/oussama/Desktop/pfe-d2f-enseignants/test_output.txt", "w", encoding="utf-8") as f:
    f.write("STDOUT:\n")
    f.write(result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout)
    f.write("\nSTDERR:\n")
    f.write(result.stderr[-2000:] if len(result.stderr) > 2000 else result.stderr)
    f.write(f"\nReturn code: {result.returncode}\n")

print(f"Done! Return code: {result.returncode}")
print(result.stdout[-1500:] if len(result.stdout) > 1500 else result.stdout)
