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


# %% ---- 2023-11-30 ------------------------
# Requirements and constants
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

# %%
fake_users_db = {
    "chuncheng": {
        "username": "chuncheng",
        "full_name": "Chuncheng Zhang",
        "email": "chuncheng.zhang@ia.ac.cn",
        "hashed_password": "fakehashedsecret",
        "disabled": False,
    },
    "noone": {
        "username": "noone",
        "full_name": "No one can save me",
        "email": "nobody@nowhere.com",
        "hashed_password": "fakehashedsecret2",
        "disabled": False,
    },
}


# %% ---- 2023-11-30 ------------------------
# Function and class
def fake_hash_password(password: str):
    return f"fakehashed{password}"


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class User(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None
    disabled: bool | None = None


class UserInDB(User):
    hashed_password: str


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def fake_decode_token(token):
    return get_user(fake_users_db, token)


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    print(token)
    if user := fake_decode_token(token):
        return user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearera"},
        )


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
):
    print(current_user)
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# %% ---- 2023-11-30 ------------------------
# Play ground


# %% ---- 2023-11-30 ------------------------
# Pending


# %% ---- 2023-11-30 ------------------------
# Pending
