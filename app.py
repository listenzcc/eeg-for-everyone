"""
File: app.py
Author: Chuncheng Zhang
Date: 2023-11-28
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


# %% ---- 2023-11-28 ------------------------
# Requirements and constants
import os
import pandas as pd

from rich import print, inspect

from fastapi import Request
from fastapi.responses import StreamingResponse

from util import LOGGER
from util.experiments import Experiments
from util.session_system import ZccSessionSystem
from util.dataframe_converter import df2csv

from route.app import app, check_user_name

# %% ---- 2023-11-28 ------------------------
# Function and class
experiments = Experiments()
zss = ZccSessionSystem()


@app.get("/zcc/experiments.csv")
async def get_experiments_csv(request: Request, response_class=StreamingResponse, experimentName: str = ''):
    username = check_user_name(request)
    LOGGER.debug(f"Checked username: {username}")
    df = experiments.to_df()
    csv = df2csv(df)
    return StreamingResponse(iter(csv), media_type="text/csv")


@app.get("/zcc/data_files.csv")
async def get_data_files_csv(request: Request, response_class=StreamingResponse, experimentName: str = ''):
    username = check_user_name(request)
    LOGGER.debug(f"Checked username: {username}")
    session = zss.get_session(username)
    print(LOGGER.debug(f'Current sessions: {zss.list_sessions()}'))

    df = session.zfs.search_data()

    if experimentName:
        df = df.query(f'experiment=="{experimentName}"')

    print(df)

    csv = df2csv(df)
    return StreamingResponse(iter(csv), media_type="text/csv")


# %% ---- 2023-11-28 ------------------------
# Play ground


# %% ---- 2023-11-28 ------------------------
# Pending


# %% ---- 2023-11-28 ------------------------
# Pending
