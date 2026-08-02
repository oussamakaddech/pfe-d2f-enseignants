from app.core.config import get_settings
from app.infrastructure.container import Container
from app.infrastructure.db.init_db import init_analyse_schema


def main() -> None:
    settings = get_settings()
    container = Container(settings)
    container.connect()
    init_analyse_schema(container.database.engine)
    print("schema analyse initialise (tables skill_gaps, recommendations, teacher_risk_snapshots, prediction_results)")
    container.dispose()


if __name__ == "__main__":
    main()
