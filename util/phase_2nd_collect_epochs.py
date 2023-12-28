"""
File: phase_2nd_collect_epochs.py
Author: Chuncheng Zhang
Date: 2023-12-25
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


# %% ---- 2023-12-25 ------------------------
# Requirements and constants
import mne
import time
import traceback

import numpy as np

from rich import print
from pathlib import Path

from . import LOGGER, CONF
from .error_box import eb
from .phase_1st_load_raw import ZccEEGRaw


# %% ---- 2023-12-25 ------------------------
# Function and class
class ZccEEGEpochs(ZccEEGRaw):
    timestamp = time.time()

    def __init__(self, path: Path):
        super(ZccEEGEpochs, self).__init__(path)

    def collect_epochs(self, events, tmin, tmax, l_freq, h_freq, decim, timestamp=None):
        # Reset following objects since the new epochs are loading
        self.epochs = None
        self.evoked = None

        assert self.raw is not None, "Failed collect_epochs, since raw is invalid."

        # Convert events from array of N numbers into shape (N, 3) events record
        events = [e for e in self.events if e[2] in events]

        kwargs = dict(
            events=events,
            tmin=tmin,
            tmax=tmax,
            baseline=(tmin, None),
            picks=["eeg"],
            preload=True,
            event_repeated="merge",
        )
        epochs = mne.Epochs(self.raw, **kwargs)
        epochs.filter(l_freq, h_freq, n_jobs=8, verbose=True)
        epochs.decimate(decim, verbose=True)

        if timestamp is None or timestamp == self.timestamp:
            self.epochs = epochs
            LOGGER.debug(f"Collected epochs: {epochs}")
        else:
            LOGGER.warning(
                f"""
Dropped the computed epochs: {epochs} since the timestamp is not matched.
The reason is it computes too slow and during the computation,
the user has commanded another computation.
"""
            )

        # self.check_progress()

        return epochs


# %% ---- 2023-12-25 ------------------------
# Play ground


# %% ---- 2023-12-25 ------------------------
# Pending


# %% ---- 2023-12-25 ------------------------
# Pending
