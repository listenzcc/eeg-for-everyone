from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI()
app.add_middleware(GZipMiddleware)
app.mount("/static", StaticFiles(directory="web/static"), name="static")

templates = Jinja2Templates(directory="web/template")


@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get('/page1')
async def index(request: Request):
    return templates.TemplateResponse("page1.html", {"request": request})


@app.get('/check')
async def index(request: Request):
    return templates.TemplateResponse("check.html", {"request": request})
