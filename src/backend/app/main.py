import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.session import check_database

logger = logging.getLogger("uvicorn.error")


def database_is_available() -> bool:
    attempts = 10
    for attempt in range(attempts):
        try:
            check_database()
        except SQLAlchemyError:
            if attempt == attempts - 1:
                return False
            time.sleep(1)
        else:
            return True
    return False


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if database_is_available():
        logger.info("PostgreSQL connection established")
    else:
        logger.warning("PostgreSQL connection failed")
    yield


app = FastAPI(title="BurnDo API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "BurnDo API is running"}


@app.get("/health")
def health(response: Response) -> dict[str, str]:
    try:
        check_database()
    except SQLAlchemyError:
        response.status_code = 503
        return {"status": "error", "database": "unavailable"}
    return {"status": "ok", "database": "connected"}
