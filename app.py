"""
File: app.py
Author: Chuncheng Zhang
Date: 2023-11-28
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    It is the routes of functional requirements.
    - get_xxx_csv refers requesting the .csv format data;
    - get_xxx refers requesting the .json format data;
    - start_with_xxx refers commanding and the responses are .json format data.

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
import json
import pandas as pd

from pathlib import Path
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


@app.get("/zcc/getExperiments.csv")
async def get_experiments_csv(
    request: Request, response_class=StreamingResponse, experimentName: str = ""
):
    username = check_user_name(request)
    LOGGER.debug(f"Checked username: {username}")
    df = experiments.to_df()
    csv = df2csv(df)
    return StreamingResponse(iter(csv), media_type="text/csv")


@app.get("/zcc/getDataFiles.csv")
async def get_data_files_csv(
    request: Request, response_class=StreamingResponse, experimentName: str = ""
):
    username = check_user_name(request)
    session = zss.get_session(username)
    LOGGER.debug(f"Checked username: {username}")
    LOGGER.debug(f"Current session: {session}")

    df = session.zfs.search_data()

    if experimentName:
        df = df.query(f'experiment=="{experimentName}"')

    print(df)

    csv = df2csv(df)
    return StreamingResponse(iter(csv), media_type="text/csv")


@app.get("/zcc/startWithEEGRaw.json")
async def start_with_eeg_raw(
    request: Request,
    response_class=StreamingResponse,
    experimentName: str = "",
    subjectID: str = "",
):
    username = check_user_name(request)
    session = zss.get_session(username)
    LOGGER.debug(f"Checked username: {username}")
    LOGGER.debug(f"Current session: {session}")

    params = dict(
        sessionName=session.name, experimentName=experimentName, subjectID=subjectID
    )

    df = session.zfs.search_data()
    df = df.query(f'subjectID=="{subjectID}"')

    # Not found any data
    if len(df) == 0:
        LOGGER.error(f"Not found subjectID: {subjectID}")
        res = dict(params, fail="Not found subjectID")
        return StreamingResponse(iter(json.dumps(res)), media_type="text/json")

    # Found multiple data
    if len(df) > 1:
        LOGGER.warning(f"Multiple subjectIDs: {df}")

    # Found one data, which is correct
    selected = dict(df.iloc[0])
    LOGGER.debug(f"Selected subjectID ({subjectID}): {selected}")

    # Do something with the session
    session.starts_with_raw(Path(selected["path"]))

    # Return the stuff
    selected["path"] = Path(selected["path"]).as_posix()
    res = params | selected
    return StreamingResponse(iter(json.dumps(res)), media_type="text/json")


@app.get("/zcc/getEEGRawMontage.json")
async def get_eeg_montage_info(
    request: Request,
    response_class=StreamingResponse,
    experimentName: str = "",
    subjectID: str = "",
):
    username = check_user_name(request)
    session = zss.get_session(username)
    LOGGER.debug(f"Checked username: {username}")
    LOGGER.debug(f"Current session: {session}")

    res = dict(
        _sessionName=session.name,
        _experimentName=experimentName,
        _subjectID=subjectID,
        _successFlag=0,  # When it is larger than 0, there are something wrong.
    )

    eeg_data = session.eeg_data
    if eeg_data is None:
        reason = f"Invalid eeg data in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=1, _failReason=reason)
        return StreamingResponse(iter(json.dumps(res)), media_type="text/json")

    montage = eeg_data.raw
    if montage is None:
        reason = f"Invalid montage in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=2, _failReason=reason)
        return StreamingResponse(iter(json.dumps(res)), media_type="text/json")

    res |= dict(ch_names=montage.ch_names)

    return StreamingResponse(
        iter(json.dumps(res, default=lambda o: f"{o}")),
        media_type="text/json",
    )


@app.get("/zcc/getEEGRawInfo.json")
async def get_eeg_raw_info(
    request: Request,
    response_class=StreamingResponse,
    experimentName: str = "",
    subjectID: str = "",
):
    username = check_user_name(request)
    session = zss.get_session(username)
    LOGGER.debug(f"Checked username: {username}")
    LOGGER.debug(f"Current session: {session}")

    res = dict(
        _sessionName=session.name,
        _experimentName=experimentName,
        _subjectID=subjectID,
        _successFlag=0,  # When it is larger than 0, there are something wrong.
    )

    eeg_data = session.eeg_data
    if eeg_data is None:
        reason = f"Invalid eeg data in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=1, _failReason=reason)
        return StreamingResponse(iter(json.dumps(res)), media_type="text/json")

    raw = eeg_data.raw
    if raw is None:
        reason = f"Invalid raw in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=2, _failReason=reason)
        return StreamingResponse(iter(json.dumps(res)), media_type="text/json")

    res |= raw.info

    return StreamingResponse(
        iter(json.dumps(res, default=lambda o: f"{o}")),
        media_type="text/json",
    )


# %% ---- 2023-11-28 ------------------------
# Play ground


# %% ---- 2023-11-28 ------------------------
# Pending


# %% ---- 2023-11-28 ------------------------
# Pending
