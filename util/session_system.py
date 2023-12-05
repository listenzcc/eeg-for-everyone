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

from . import LOGGER, singleton
from .file_system import ZccFileSystem
from .phase_1st_load_raw import LoadRaw


# %% ---- 2023-12-05 ------------------------
# Function and class
class ZccSession(object):
    zfs = ZccFileSystem()

    def __init__(self, name: str):
        self.name = name
        self.refresh_time_stamp()
        LOGGER.debug(f"Initialized {self.__class__}")

    def refresh_time_stamp(self):
        self.time = time.time()

    def idle_secs(self):
        return time.time() - self.time

    def load_raw(self, l_raw: LoadRaw):
        self.l_raw = l_raw


@singleton
class ZccSessionSystem(object):
    sessions = {}
    too_long_secs = 5 * 60 * 60  # Hours x minutes x seconds, 5 hours

    def __init__(self):
        pass

    def get_session(self, name: str = None):
        if name is None:
            LOGGER.error(f"Invalid session name: {name}")
            return None

        if session := self.sessions.get(name):
            session.refresh_time_stamp()
            LOGGER.debug(f"Using existing session: {name}, {session}")
        else:
            session = ZccSession(name)
            self.sessions[name] = session
            LOGGER.debug(f"New session: {name}, {session}")

        return session

    def list_sessions(self):
        data = [(k, v.idle_secs()) for k, v in self.sessions.items()]
        return pd.DataFrame(data, columns=["name", "idleSecs"])

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
