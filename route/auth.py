"""
File: auth.py
Author: Chuncheng Zhang
Date: 2023-11-30
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    Provide authentication functional for the fastapi app.
    The script is **only** designed to be called by the app.py script.

Functions:
    1. Requirements and constants
    2. Function and class
    3. Play ground
    4. Pending
    5. Pending
"""
import subprocess


from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# %%


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class User(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None
    disabled: bool | None = None


class UserInDB(User):
    hashed_password: str


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# %%


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def authenticate_user(fake_db, username: str, password: str):
    if user := get_user(fake_db, username):
        return user if verify_password(password, user.hashed_password) else False
    else:
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError as e:
        raise credentials_exception from e
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# %% ---- 2023-11-30 ------------------------
# Play ground

# ? I do not quite sure if it crushes when the variables are set below
# to get a string like this run:
# openssl rand -hex 32
# "f67dd244499e46a3a3aca6eae90f5a6f95a3925d0a0f5f2d4556cf109d16b6b1"
SECRET_KEY = subprocess.check_output(['openssl', 'rand', '-hex', '32'])
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

fake_users_db = {
    "chuncheng": {
        "username": "chuncheng",
        "full_name": "Chuncheng Zhang",
        "email": "chuncheng.zhang@ia.ac.cn",
        # "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
        "hashed_password": get_password_hash('secret'),
        "disabled": False,
    },
    "noone": {
        "username": "noone",
        "full_name": "No one can save me",
        "email": "nobody@nowhere.com",
        "hashed_password": get_password_hash('secret'),
        "disabled": False,
    },
}


# %% ---- 2023-11-30 ------------------------
# Pending


# %% ---- 2023-11-30 ------------------------
# Pending
