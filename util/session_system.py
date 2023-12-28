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

from rich import print, inspect
from pathlib import Path
from threading import Thread

from . import LOGGER, singleton
from .file_system import ZccFileSystem
from .phase_1st_load_raw import ZccEEGRaw
from .phase_2nd_collect_epochs import ZccEEGEpochs


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
        None."""

    time = time.time()
    eeg_data = None
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

    def starts_with_raw(self, data_path: Path, subjectID: str):
        """
        Starts a session with the specified subject ID and returns the associated EEG data.
        If the subject ID is already set to the specified value, the existing EEG data is returned.
        Otherwise, a new session is started with the specified subject ID, and the EEG data is loaded, fixed, and events are retrieved.

        Args:
            data_path (Path): The path to the EEG data.
            subjectID (str): The subject ID to associate with the session.

        Returns:
            ZccEEGRaw: The EEG data associated with the session.

        Raises:
            None"""

        if self.subjectID == subjectID:
            LOGGER.debug(f"Session {self.name} is using subjectID {self.subjectID}")
            return self.eeg_data

        self.subjectID = subjectID
        # self.eeg_data = ZccEEGRaw(data_path)
        self.eeg_data = ZccEEGEpochs(data_path)
        self.eeg_data.load_raw()
        self.eeg_data.fix_montage()
        self.eeg_data.get_events()

        LOGGER.debug(f"Session {self.name} started with new subjectID {self.subjectID}")
        return self.eeg_data

    def collect_epochs(self, events, tmin, tmax, l_freq, h_freq, decim):
        """
        Collects epochs based on the provided events and parameters asynchronously.

        Args:
            events (list): The list of events.
            tmin (float): The minimum time value.
            tmax (float): The maximum time value.
            l_freq (float): The low frequency value.
            h_freq (float): The high frequency value.
            decim (int): The decimation value.

        Returns:
            None

        Raises:
            None"""

        def _collect_epochs():
            # Newer timestamp prevents older ones from being used.
            timestamp = time.time()
            self.eeg_data.timestamp = timestamp
            epochs = self.eeg_data.collect_epochs(
                events, tmin, tmax, l_freq, h_freq, decim, timestamp
            )

            LOGGER.debug(
                f"Session {self.name} collected epochs for subjectID {self.subjectID}, {epochs}"
            )

        Thread(target=_collect_epochs, daemon=True).start()
        return


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
        session_system.remove_idle_too_long_sessions()"""

    sessions = {}
    too_long_secs = 5 * 60 * 60  # Hours x minutes x seconds, 5 hours

    def __init__(self):
        pass

    def get_session(self, username: str = None):
        """
        Returns the session associated with the given username. If the username is None, an error is logged and None is returned.
        If an existing session is found, its timestamp is refreshed and the session is returned. Otherwise, a new session is created and returned.

        Args:
            username (str): The username associated with the session.

        Returns:
            ZccSession or None: The session associated with the given username, or None if the username is invalid.

        Raises:
            None

        Examples:
            session = get_session("john")
            if session:
                print(session)"""

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
        LOGGER.debug(f"List sessions: {df}")
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
