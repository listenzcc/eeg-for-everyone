from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI()
app.add_middleware(GZipMiddleware)
app.mount("/static", StaticFiles(directory="src"), name="static")

templates = Jinja2Templates(directory="src")


@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("base.html", {"request": request})


@app.get('/dist/output.css')
async def foo(request: Request):
    return templates.TemplateResponse("dist/output.css", {"request": request})
