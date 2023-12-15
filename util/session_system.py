"""
File: session_system.py
Author: Chuncheng Zhang
Date: 2023-12-05
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


# %% ---- 2023-12-05 ------------------------
# Requirements and constants
import time
import pandas as pd

from pathlib import Path

from . import LOGGER, singleton
from .file_system import ZccFileSystem
from .phase_1st_load_raw import ZccEEGRaw


# %% ---- 2023-12-05 ------------------------
# Function and class
class ZccSession(object):
    """
ZccSession class.

A class representing a user session.
It provides methods to refresh the session timestamp, calculate the idle time in seconds, and load raw EEG data.

Args:
    sessionName (str): The name of the session.

Returns:
    None.

Raises:
    None.
"""

    time = time.time()
    eeg_raw = None
    subjectID = None
    zfs = ZccFileSystem()

    def __init__(self, sessionName: str):
        self.name = sessionName
        self.refresh_time_stamp()
        LOGGER.debug(f"Initialized {self.__class__}")

    def refresh_time_stamp(self):
        self.time = time.time()

    def idle_secs(self):
        return time.time() - self.time

    def starts_with_raw(self, data_path: Path):
        self.eeg_raw = ZccEEGRaw(data_path)


@singleton
class ZccSessionSystem(object):
    """
ZccSessionSystem class.

A singleton class that manages user sessions.
It provides methods to get a session, list all sessions, and remove idle sessions that have been active for too long.

Args:
    username (str, optional): The username associated with the session.

Returns:
    ZccSession or None: The session object associated with the given username, or None if the username is invalid.

Raises:
    None.

Examples:
    session_system = ZccSessionSystem()
    session = session_system.get_session("user123")
    session_system.list_sessions()
    session_system.remove_idle_too_long_sessions()
"""

    sessions = {}
    too_long_secs = 5 * 60 * 60  # Hours x minutes x seconds, 5 hours

    def __init__(self):
        pass

    def get_session(self, username: str = None):
        if username is None:
            LOGGER.error(f"Invalid session name: {username}")
            return None

        if session := self.sessions.get(username):
            session.refresh_time_stamp()
            LOGGER.debug(f"Using existing session: {username}, {session}")
        else:
            session = ZccSession(username)
            self.sessions[username] = session
            LOGGER.debug(f"New session: {username}, {session}")

        return session

    def list_sessions(self):
        data = [(k, v.idle_secs()) for k, v in self.sessions.items()]
        df = pd.DataFrame(data, columns=["name", "idleSecs"])
        LOGGER.debug(f'List sessions: {df}')
        return df

    def remove_idle_too_long_sessions(self):
        for name, v in self.sessions.items():
            if v.idle_secs() > self.too_long_secs:
                session = self.sessions.pop(name)
                LOGGER.debug(f"Removed expired session: {name} {session}")


# %% ---- 2023-12-05 ------------------------
# Play ground


# %% ---- 2023-12-05 ------------------------
# Pending


# %% ---- 2023-12-05 ------------------------
# Pending
