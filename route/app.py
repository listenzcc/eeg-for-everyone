"""
File: app.py
Author: Chuncheng Zhang
Date: 2023-11-27
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    Provide fastapi app for the project

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

from fastapi import FastAPI, Request, Response
from fastapi.responses import RedirectResponse

from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware

from starlette.middleware.sessions import SessionMiddleware

from .tools import unique_md5
from .auth import *


# %% ---- 2023-11-27 ------------------------
# Function and class
app = FastAPI()
app.add_middleware(GZipMiddleware)
app.add_middleware(SessionMiddleware, secret_key="secret_key")
app.mount("/static", StaticFiles(directory="web/static"), name="static")
app.mount("/src", StaticFiles(directory="web/src"), name="src")
app.mount("/asset", StaticFiles(directory="asset"), name="asset")

# %%
templates = Jinja2Templates(directory="web/template")

# %%


def check_user_name(request: Request):
    default = None
    default = "No one from no where in no when"

    cookies = request.cookies
    if token := cookies.get("access_token", None):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except Exception:
            return default
        if username := payload.get("sub"):
            return username
    return default


# %%


@app.middleware("http")
async def session_middleware(request: Request, call_next):
    """
    Middleware function that intercepts HTTP requests and performs some operations before and after the request is processed.

    Args:
        request (Request): The incoming HTTP request.
        call_next (Callable): The next middleware or route handler to call.

    Returns:
        Response: The HTTP response.

    Examples:
        # Assuming request is a valid Request object and call_next is a valid callable
        >>> session_middleware(request, call_next)
        <Response object>"""

    response = await call_next(request)
    if session := request.cookies.get("session"):
        response.set_cookie(
            key="session", value=request.cookies.get("session"), httponly=True
        )
    return response


@app.post("/token", response_model=Token)
async def require_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], response: Response
):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    response.set_cookie(key="access_token", value=access_token)
    response.set_cookie(key="token_type", value="bearer")
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/login", response_class=RedirectResponse)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request,
    response: Response,
):
    username = check_user_name(request)

    response = RedirectResponse(
        url="/template/profile.html", status_code=status.HTTP_303_SEE_OTHER
    )

    if not username:
        user = authenticate_user(fake_users_db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        response.set_cookie(key="access_token", value=access_token)
        response.set_cookie(key="token_type", value="bearer")

    # templates.TemplateResponse("index.html", {"request": request})
    return response


@app.get("/users/me/", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    return current_user


@app.get("/users/me/items/")
async def read_own_items(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    return [{"item_id": "Foo", "owner": current_user.username}]


# %% ---- 2023-11-27 ------------------------
# Basic route


@app.get("/")
async def index(
    request: Request,
    # token: Annotated[str, Depends(oauth2_scheme)]
):
    """
    Handles the HTTP GET request to the root URL ("/") and returns the index.html template.

    Args:
        request (Request): The incoming HTTP request.

    Returns:
        TemplateResponse: The rendered index.html template.

    Examples:
        # Assuming request is a valid Request object
        >>> index(request)
        <TemplateResponse object>"""

    request.session["no-matter-what"] = "a"  # unique_md5()
    request.cookies["sayHi"] = "Hello from chuncheng.zhang@ia.ac.cn"
    print(request.cookies)

    username = check_user_name(request)
    print(f"Username: {username}")
    if not username:
        return templates.TemplateResponse("login.html", {"request": request})

    # print(token)

    return templates.TemplateResponse(
        "profile.html", dict(request=request, username=username)
    )


@app.get("/template/{template_name}")
async def index(template_name: str, request: Request):
    """
    Handles the HTTP GET request to the "/template/{template_name}" URL and returns the specified template.

    Args:
        template_name (str): The name of the template to render.
        request (Request): The incoming HTTP request.

    Returns:
        TemplateResponse: The rendered template.

    Examples:
        # Assuming template_name is a valid template name and request is a valid Request object
        >>> index(template_name, request)
        <TemplateResponse object>"""

    print(request.cookies)
    if not template_name.endswith(".html"):
        template_name += ".html"

    username = check_user_name(request)
    print(f"Username: {username}")
    if not username:
        return templates.TemplateResponse("login.html", {"request": request})

    return templates.TemplateResponse(
        template_name, dict(request=request, username=username)
    )


# %% ---- 2023-11-27 ------------------------
# Pending


# %% ---- 2023-11-27 ------------------------
# Pending
