from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.envelope import error_response
from app.core.exceptions import AppError
from app.core.logging import get_logger

logger = get_logger("error_handlers")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        logger.warning("requete en erreur", code=exc.code, path=request.url.path)
        return JSONResponse(status_code=exc.http_status, content=error_response([exc.to_dict()]))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {
                "code": "VALIDATION_ERROR",
                "message": f"Champ {'.'.join(str(loc) for loc in err.get('loc', []))}: {err.get('msg', 'invalide')}",
            }
            for err in exc.errors()
        ]
        return JSONResponse(status_code=422, content=error_response(errors))

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("erreur interne non geree", path=request.url.path)
        return JSONResponse(
            status_code=500,
            content=error_response([{"code": "INTERNAL_ERROR", "message": "Erreur interne du service"}]),
        )
