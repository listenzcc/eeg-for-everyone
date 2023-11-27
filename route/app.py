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
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware


# %% ---- 2023-11-27 ------------------------
# Function and class
app = FastAPI()
app.add_middleware(GZipMiddleware)
app.mount("/static", StaticFiles(directory="web/static"), name="static")
app.mount("/src", StaticFiles(directory="web/src"), name="src")

# %% ---- 2023-11-27 ------------------------
# Play ground
templates = Jinja2Templates(directory="web/template")


@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get('/template/{template_name}')
async def index(template_name: str, request: Request):
    if not template_name.endswith('.html'):
        template_name += '.html'
    return templates.TemplateResponse(template_name, {"request": request})

# %% ---- 2023-11-27 ------------------------
# Pending


# %% ---- 2023-11-27 ------------------------
# Pending
