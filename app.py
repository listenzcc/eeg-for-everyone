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
import traceback
import numpy as np
import pandas as pd

from pathlib import Path
from rich import print, inspect

from fastapi import Request, Form, status
from fastapi.responses import (
    StreamingResponse,
    FileResponse,
    Response,
    RedirectResponse,
)

from util import LOGGER
from util.experiments import Experiments
from util.session_system import ZccSessionSystem
from util.dataframe_converter import df2csv

from route.app import app, check_user_name

# %% ---- 2023-11-28 ------------------------
# Function and class
experiments = Experiments()
zss = ZccSessionSystem()


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(Path("asset/favicon.ico"))


@app.get("/zcc/getExperiments.csv")
async def get_experiments_csv(request: Request):
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

    csv = df2csv(df)
    return StreamingResponse(iter(csv), media_type="text/csv")


@app.get("/zcc/startWithEEGRaw.json")
async def start_with_eeg_raw(
    request: Request,
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
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    # Found multiple data
    if len(df) > 1:
        LOGGER.warning(f"Multiple subjectIDs: {df}")

    # Found one data, which is correct
    selected = dict(df.iloc[0])
    LOGGER.debug(f"Selected subjectID ({subjectID}): {selected}")

    # Do something with the session
    session.starts_with_raw(Path(selected["path"]), selected["subjectID"])

    # Return the stuff
    selected["path"] = Path(selected["path"]).as_posix()
    res = params | selected
    return StreamingResponse(iter(json.dumps(res)), media_type="text/json")


@app.get("/zcc/getEEGRawMontage.json")
async def get_eeg_montage_info(
    request: Request,
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
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    raw = eeg_data.raw
    if raw is None:
        reason = f"Invalid raw in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=2, _failReason=reason)
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    res |= raw.info

    # return StreamingResponse(
    #     iter(json.dumps(res, default=lambda o: f"{o}")),
    #     media_type="text/json",
    # )
    return Response(
        json.dumps(res, default=lambda o: f"{o}"),
        media_type="text/json",
    )


@app.get("/zcc/getEEGRawData.csv")
async def get_eeg_raw_data_csv(
    request: Request,
    experimentName: str = "",
    subjectID: str = "",
    seconds: float = 0,
    windowLength: float = 10,
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
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    raw = eeg_data.raw
    if raw is None:
        reason = f"Invalid raw in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=2, _failReason=reason)
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    events = eeg_data.events
    if events is None:
        reason = f"Invalid events in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=3, _failReason=reason)
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    LOGGER.debug(
        f"Fetched data center at {seconds} seconds, window length is {windowLength}"
    )

    # Data size is converted into (time points x channels)
    data = raw.get_data().transpose()
    data -= np.mean(data, axis=0)

    data_df = pd.DataFrame(data, columns=raw.info["ch_names"])
    data_df["seconds"] = data_df.index / raw.info["sfreq"]
    lower = seconds - windowLength / 2
    upper = seconds + windowLength / 2
    data_df = data_df.query(f"seconds < {upper}").query(f"seconds > {lower}")

    events_df = pd.DataFrame(events, columns=["samples", "duration", "label"])
    events_df["seconds"] = events_df["samples"] / raw.info["sfreq"]

    csv = df2csv(data_df)
    # return StreamingResponse(iter(csv), media_type="text/csv")
    return Response(csv, media_type="text/csv")


@app.get("/zcc/getEEGRawEvents.csv")
async def get_eeg_raw_events_csv(
    request: Request,
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
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    raw = eeg_data.raw
    if raw is None:
        reason = f"Invalid raw in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=2, _failReason=reason)
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    events = eeg_data.events
    if events is None:
        reason = f"Invalid events in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=3, _failReason=reason)
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    df = pd.DataFrame(events, columns=["samples", "duration", "label"])
    df["seconds"] = df["samples"] / raw.info["sfreq"]

    csv = df2csv(df)
    # return StreamingResponse(iter(csv), media_type="text/csv")
    return Response(csv, media_type="text/csv")


@app.get("/zcc/getEEGEpochsEvents.csv")
async def get_eeg_epochs_events_csv(
    request: Request,
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
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    epochs = eeg_data.epochs
    if epochs is None:
        reason = f"Invalid raw in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=2, _failReason=reason)
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    df = pd.DataFrame(epochs.events, columns=["timeStamp", "duration", "label"])
    csv = df2csv(df)

    return Response(csv, media_type="text/csv")


@app.get("/zcc/getEEGEvokedData.csv")
async def get_eeg_evoked_data_csv(
    request: Request,
    event: int = 0,
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
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    epochs = eeg_data.epochs
    if epochs is None:
        reason = f"Invalid raw in session: {session}"
        LOGGER.warning(reason)
        res |= dict(_successFlag=2, _failReason=reason)
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )

    try:
        evoked = epochs[f"{event}"].average()
        # Data shape is (timepoints x channels)
        data = evoked.get_data().transpose()

        df = pd.DataFrame(data, columns=epochs.ch_names)
        df["_times"] = epochs.times
        print(df)
        csv = df2csv(df)
        return Response(csv, media_type="text/csv")

    except Exception as err:
        res |= dict(_successFlag=3, _failReason=traceback.format_exc())
        return StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        )


@app.post("/template/setup.html", response_class=RedirectResponse)
async def post_template_setup_html(
    request: Request,
    defaultName: str = Form(
        default="defaultDefaultNameValue"
    ),  # Parse the posted params
    name1: str = Form(default="defaultName1Value"),  # Parse the posted params
    experimentName: str = "",
    subjectID: str = "",
):
    username = check_user_name(request)
    session = zss.get_session(username)
    LOGGER.debug(f"Checked username: {username}")
    LOGGER.debug(f"Current session: {session}, {session.name}, {session.subjectID}")

    # Make sure the session is using the same EEG data
    if session.subjectID != subjectID:
        sol = dict(
            subjectID=subjectID,
            msg=f"Not found subjectID: {subjectID}, current subjectID is {session.subjectID}",
            whatToDo="Press the 'Raw' tab on the header bar to reload the subjectID data",
        )
        LOGGER.warning(f"Can not process setup request, giving solution: {sol}")
        return Response(
            json.dumps(sol),
            media_type="text/json",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return RedirectResponse(
        url=f"/template/setup.html?experimentName={experimentName}&subjectID={subjectID}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@app.post("/template/analysis.html", response_class=RedirectResponse)
async def post_template_analysis_html(
    request: Request,
    experimentName: str = "",
    subjectID: str = "",
    events: str = Form(),
    filter: str = Form(),
    crop: str = Form(),
):
    username = check_user_name(request)
    session = zss.get_session(username)
    LOGGER.debug(f"Checked username: {username}")
    LOGGER.debug(f"Current session: {session}, {session.name}, {session.subjectID}")

    # Make sure the session is using the same EEG data
    if session.subjectID != subjectID:
        sol = dict(
            subjectID=subjectID,
            msg=f"Not found subjectID: {subjectID}, current subjectID is {session.subjectID}",
            whatToDo="Press the 'Raw' tab on the header bar to reload the subjectID data",
        )
        LOGGER.warning(f"Can not process setup request, giving solution: {sol}")
        return Response(
            json.dumps(sol),
            media_type="text/json",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    setup = dict(
        events=json.loads(events)["value"],
        filter=json.loads(filter)["value"],
        crop=json.loads(crop)["value"],
    )
    LOGGER.debug(f"Received setup: {setup}")

    try:
        events = [e["num"] for e in setup["events"]]
        tmin = setup["crop"]["tMin"]
        tmax = setup["crop"]["tMax"]
        l_freq = setup["filter"]["lFreq"]
        h_freq = setup["filter"]["hFreq"]
        decim = setup["filter"]["downSampling"]
        session.collect_epochs(events, tmin, tmax, l_freq, h_freq, decim)

    except Exception as err:
        return Response(
            json.dumps(dict(err=f"{err}", traceback=traceback.format_exc())),
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return RedirectResponse(
        url=f"/template/analysis.html?experimentName={experimentName}&subjectID={subjectID}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


# %% ---- 2023-11-28 ------------------------
# Play ground


# %% ---- 2023-11-28 ------------------------
# Pending


# %% ---- 2023-11-28 ------------------------
# Pending
