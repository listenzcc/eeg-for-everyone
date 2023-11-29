"""
File: app.py
Author: Chuncheng Zhang
Date: 2023-11-27
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    Amazing things

Functions:
    1. Requirements and constants
    2. Function and class
    3. Play ground
    4. Pending
    5. Pending
"""


# %% ---- 2023-11-27 ------------------------
# Requirements and constants
from rich import print, inspect

from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware

from starlette.middleware.sessions import SessionMiddleware

from .tools import unique_md5


# %% ---- 2023-11-27 ------------------------
# Function and class
app = FastAPI()
app.add_middleware(GZipMiddleware)
app.add_middleware(SessionMiddleware, secret_key='secret_key')
app.mount("/static", StaticFiles(directory="web/static"), name="static")
app.mount("/src", StaticFiles(directory="web/src"), name="src")
app.mount("/asset", StaticFiles(directory="asset"), name="asset")

# %%


@app.middleware("http")
async def some_middleware(request: Request, call_next):
    response = await call_next(request)
    if session := request.cookies.get('session'):
        response.set_cookie(
            key='session', value=request.cookies.get('session'), httponly=True)
    return response

# %% ---- 2023-11-27 ------------------------
# Play ground
templates = Jinja2Templates(directory="web/template")


@app.get("/")
async def index(request: Request):
    request.session['no-matter-what'] = 'a'  # unique_md5()
    request.cookies['sayHi'] = 'Hello from chuncheng.zhang@ia.ac.cn'
    print(request.cookies)
    return templates.TemplateResponse("index.html", {"request": request})


@app.get('/template/{template_name}')
async def index(template_name: str, request: Request):
    print(request.cookies)
    if not template_name.endswith('.html'):
        template_name += '.html'
    return templates.TemplateResponse(template_name, {"request": request})

# %% ---- 2023-11-27 ------------------------
# Pending


# %% ---- 2023-11-27 ------------------------
# Pending
