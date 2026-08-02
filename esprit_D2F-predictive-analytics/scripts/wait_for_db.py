import sys
import time

from sqlalchemy import text

from app.core.config import get_settings
from app.infrastructure.container import Container


def main() -> None:
    settings = get_settings()
    container = Container(settings)
    container.connect()
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            with container.database.read_connection() as connection:
                connection.execute(text("SELECT 1"))
            print("base de donnees disponible")
            return
        except Exception as exc:
            print(f"attente de la base de donnees... ({exc})")
            time.sleep(2)
    print("base de donnees injoignable apres 30s")
    sys.exit(1)


if __name__ == "__main__":
    main()
