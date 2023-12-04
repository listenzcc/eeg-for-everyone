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

from fastapi import Request
from fastapi.responses import StreamingResponse

from util import LOGGER
from util.experiments import Experiments
from route.app import app, check_user_name

# %% ---- 2023-11-28 ------------------------
# Function and class
experiments = Experiments()


@app.get("/experiments.csv")
async def get_experiments_csv(request: Request, response_class=StreamingResponse):
    username = check_user_name(request)
    LOGGER.debug(f"Checked username: {username}")
    return StreamingResponse(iter(experiments.to_csv()), media_type="text/csv")


# %% ---- 2023-11-28 ------------------------
# Play ground


# %% ---- 2023-11-28 ------------------------
# Pending


# %% ---- 2023-11-28 ------------------------
# Pending
