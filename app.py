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
import mne
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
from util.session_system import ZccSessionSystem, ZccSession
from util.dataframe_converter import df2csv
from util.doc import ZccErrorCode

from route.app import app, check_user_name

# %% ---- 2023-11-28 ------------------------
# Global variables
experiments = Experiments()
zss = ZccSessionSystem()
zec = ZccErrorCode


# %% ---- 2023-12-29 ------------------------
# Tool functions
def fetch_user_identity_and_session(request: Request):
    """
    Fetches the user identity and session based on the provided request.

    Args:
        request (Request): The request object.

    Returns:
        tuple: A tuple containing the username and session.

    Example:
        request = Request()
        username, session = fetch_user_identity_and_session(request)
        print(username, session)"""

    username = check_user_name(request)
    LOGGER.debug(f"Checked username: {username}")

    if username is None:
        LOGGER.warning("Failed check username.")
        return None, None

    session = zss.get_session(username)
    LOGGER.debug(f"Current session: {session.subjectID} | {session.name} | {session}")

    return username, session


def handle_known_failure(fail_reason: str, _successFlag: zec, res: dict = None):
    if res is None:
        res = {}
    LOGGER.warning(fail_reason)
    res |= dict(_successFlag=_successFlag.value, _failReason=fail_reason)
    return (
        StreamingResponse(
            iter(json.dumps(res)), media_type="text/json", status_code=404
        ),
        res,
    )


def get_attr_from_session(session: ZccSession, res: dict, attr_name: str):
    """
    Gets the raw from the given session.

    Args:
        session: The session object.
        res (dict): The result dictionary.

    Returns:
        tuple: A tuple containing the raw and the updated result dictionary.

    Raises:
        StreamingResponse: If the data cannot be retrieved.

    Example:
        session = Session()
        result = {}
        epochs, result = get_epochs_from_session(session, result)
        print(epochs, result)"""

    eeg_data = session.eeg_data
    if eeg_data is None:
        return handle_known_failure(
            f"Invalid eeg data | {session.name} | {session.subjectID}",
            zec.SHOULD_NOT_NONE,
            res,
        )

    if not hasattr(eeg_data, attr_name):
        return handle_known_failure(
            f"Invalid attr {attr_name} | {session.name} | {session.subjectID}",
            zec.INVALID_ATTR,
            res,
        )

    attr = getattr(eeg_data, attr_name)
    if attr is None:
        return handle_known_failure(
            f"None value in attr {attr_name} | {session.name} | {session.subjectID}",
            zec.SHOULD_NOT_NONE,
            res,
        )

    return attr, res


def mk_res(
    session: ZccSession, experimentName: str, subjectID: str, others: dict = None
) -> dict:
    res = dict(
        _sessionSubjectID=session.subjectID if session.subjectID is not None else "",
        _sessionName=session.name,
        _experimentName=experimentName,
        _subjectID=subjectID,
        _successFlag=0,
    )

    if others is not None and isinstance(others, dict):
        res |= others

    return res


# %% ---- 2023-11-28 ------------------------
# Function and class
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(Path("asset/favicon.ico"))


@app.get("/zcc/getExperiments.csv")
async def get_experiments_csv(request: Request):
    username, session = fetch_user_identity_and_session(request)

    try:
        df = experiments.to_df()
        assert len(df) > 0, "No experiments found"
        csv = df2csv(df)
        return StreamingResponse(iter(csv), media_type="text/csv")
    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING)
        return resp


@app.get("/zcc/getDataFiles.csv")
async def get_data_files_csv(
    request: Request, response_class=StreamingResponse, experimentName: str = ""
):
    username, session = fetch_user_identity_and_session(request)

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
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    try:
        df = session.zfs.search_data()
        df = df.query(f'subjectID=="{subjectID}"')
        assert len(df) > 0, "No experiments found"

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
        res |= selected
        return StreamingResponse(iter(json.dumps(res)), media_type="text/json")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGRawMontage.json")
async def get_eeg_montage_info(
    request: Request,
    experimentName: str = "",
    subjectID: str = "",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    montage, res = get_attr_from_session(session, res, attr_name="montage")
    if res["_successFlag"] > 0:
        return montage

    try:
        res |= dict(ch_names=montage.ch_names)

        return StreamingResponse(
            iter(json.dumps(res, default=lambda o: f"{o}")),
            media_type="text/json",
        )
    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGRawInfo.json")
async def get_eeg_raw_info(
    request: Request,
    experimentName: str = "",
    subjectID: str = "",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    raw, res = get_attr_from_session(session, res, attr_name="raw")
    if res["_successFlag"] > 0:
        return raw

    try:
        res |= raw.info
        return Response(
            json.dumps(res, default=lambda o: f"{o}"),
            media_type="text/json",
        )
    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGRawData.csv")
async def get_eeg_raw_data_csv(
    request: Request,
    experimentName: str = "",
    subjectID: str = "",
    seconds: float = 0,
    windowLength: float = 10,
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(
        session,
        experimentName,
        subjectID,
        {"seconds": seconds, "windowLength": windowLength},
    )

    raw, res = get_attr_from_session(session, res, attr_name="raw")
    if res["_successFlag"] > 0:
        return raw

    events, res = get_attr_from_session(session, res, attr_name="events")
    if res["_successFlag"] > 0:
        return events

    LOGGER.debug(
        f"Fetched data center at {seconds} seconds, window length is {windowLength}"
    )

    try:
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
        return Response(csv, media_type="text/csv")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGRawEvents.csv")
async def get_eeg_raw_events_csv(
    request: Request,
    experimentName: str = "",
    subjectID: str = "",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    raw, res = get_attr_from_session(session, res, attr_name="raw")
    if res["_successFlag"] > 0:
        return raw

    events, res = get_attr_from_session(session, res, attr_name="events")
    if res["_successFlag"] > 0:
        return events

    try:
        df = pd.DataFrame(events, columns=["samples", "duration", "label"])
        df["seconds"] = df["samples"] / raw.info["sfreq"]

        csv = df2csv(df)
        return Response(csv, media_type="text/csv")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGEpochsEvents.csv")
async def get_eeg_epochs_events_csv(
    request: Request,
    experimentName: str = "",
    subjectID: str = "",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    epochs, res = get_attr_from_session(session, res, attr_name="epochs")
    if res["_successFlag"] > 0:
        return epochs

    try:
        df = pd.DataFrame(epochs.events, columns=["timeStamp", "duration", "label"])
        csv = df2csv(df)

        return Response(csv, media_type="text/csv")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGSingleSensorAveragedPSD.csv")
async def get_eeg_single_sensor_averaged_psd_csv(
    request: Request,
    sensorName: str,
    eventLabel: str,
    experimentName: str = "",
    subjectID: str = "",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    epochs, res = get_attr_from_session(session, res, attr_name="epochs")
    if res["_successFlag"] > 0:
        return epochs

    try:
        epochs = epochs[eventLabel]
        LOGGER.debug(f"Selected epochs: {epochs}")
        evoked = epochs.average(picks=[sensorName])

        spectrum = evoked.compute_psd()
        df = spectrum.to_data_frame()

        print(df)

        csv = df2csv(df)
        return Response(csv, media_type="text/csv")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGSingleSensorAveragedData.csv")
async def get_eeg_single_sensor_averaged_data_csv(
    request: Request,
    sensorName: str,
    eventLabel: str,
    experimentName: str = "",
    subjectID: str = "",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    epochs, res = get_attr_from_session(session, res, attr_name="epochs")
    if res["_successFlag"] > 0:
        return epochs

    try:
        epochs = epochs[eventLabel]
        LOGGER.debug(f"Selected epochs: {epochs}")
        evoked = epochs.average(picks=[sensorName])

        # Data shape is (1 x times)
        data = evoked.get_data()

        df = pd.DataFrame(data)
        csv = df2csv(df)
        return Response(csv, media_type="text/csv")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGSingleSensorData.csv")
async def get_eeg_single_sensor_data_csv(
    request: Request,
    sensorName: str,
    experimentName: str = "",
    subjectID: str = "",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    epochs, res = get_attr_from_session(session, res, attr_name="epochs")
    if res["_successFlag"] > 0:
        return epochs

    try:
        # Raw data shape is (events x 1 x times)
        # The data is squeezed into (events x times)
        data = epochs.get_data(picks=[sensorName]).squeeze()
        # Append the times into the data, as the last raw.
        # It changes the data into (events+1 x times) shape
        data = np.concatenate([data, epochs.times[np.newaxis, :]], axis=0)
        df = pd.DataFrame(data)
        csv = df2csv(df)
        return Response(csv, media_type="text/csv")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


@app.get("/zcc/getEEGEvokedData.csv")
async def get_eeg_evoked_data_csv(
    request: Request,
    event: int = 0,
    experimentName: str = "",
    subjectID: str = "",
    dataType: str = "timeCourse",
):
    username, session = fetch_user_identity_and_session(request)

    res = mk_res(session, experimentName, subjectID)

    epochs, res = get_attr_from_session(session, res, attr_name="epochs")
    if res["_successFlag"] > 0:
        return epochs

    try:
        evoked = epochs[f"{event}"].average()
        # Data shape is (timepoints x channels)
        data = evoked.get_data().transpose()

        if dataType == "timeCourse":
            df = pd.DataFrame(data, columns=epochs.ch_names)
            df["_times"] = epochs.times

        elif dataType == "freqDomain":
            n = data.shape[0]
            fft = np.fft.fft(data, axis=0)
            # abs_fft = np.abs(fft) / n
            # df = pd.DataFrame(abs_fft, columns=epochs.ch_names)

            # Return the complex value of (re) + (im) x j
            fft /= n
            df = pd.DataFrame(fft, columns=epochs.ch_names)
            df = df.applymap(lambda e: f"{np.real(e)},{np.imag(e)}")

            df["_freq"] = np.linspace(0, evoked.info["sfreq"], n)
            df = df.iloc[: int(n / 2)]

        csv = df2csv(df)

        return Response(csv, media_type="text/csv")

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING, res)
        return resp


# %% ----------------------------------------------------------------
"""
The post requests which are designed submitting from button click with posting the HTML form.
"""


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
    username, session = fetch_user_identity_and_session(request)

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


@app.post("/template/singleSensorAnalysis.html", response_class=RedirectResponse)
async def get_template_single_sensor_analysis_html(
    request: Request, experimentName: str = "", subjectID: str = ""
):
    username, session = fetch_user_identity_and_session(request)

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
        url=f"/template/singleSensorAnalysis.html?experimentName={experimentName}&subjectID={subjectID}",
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
    """
    It is the command which starts the epochs generation.
    """
    username, session = fetch_user_identity_and_session(request)

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

        return RedirectResponse(
            url=f"/template/analysis.html?experimentName={experimentName}&subjectID={subjectID}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except Exception:
        fail_reason = traceback.format_exc()
        resp, _ = handle_known_failure(fail_reason, zec.FAIL_PROCESSING)
        return resp


# %% ---- 2023-11-28 ------------------------
# Play ground


# %% ---- 2023-11-28 ------------------------
# Pending


# %% ---- 2023-11-28 ------------------------
# Pending
