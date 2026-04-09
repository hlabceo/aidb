from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, search, points, admin

app = FastAPI(
    title="AIDB 소상공인 검색 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://aidb.kr"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(search.router)
app.include_router(points.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
