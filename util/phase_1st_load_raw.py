"""
File: phase_1st_load_raw.py
Author: Chuncheng Zhang
Date: 2023-11-23
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


# %% ---- 2023-11-23 ------------------------
# Requirements and constants
import mne

from rich import print
from pathlib import Path
from collections import OrderedDict

from . import LOGGER, CONF
from .error_box import eb


# %% ---- 2023-11-23 ------------------------
# Function and class


class LoadRaw(object):
    path = None
    raw = None
    montage = None
    events = None
    event_id = None
    epochs = None
    evoked = None

    def __init__(self, path):
        self.path = Path(path)
        self.check_progress()

    def check_progress(self):
        progress = OrderedDict(
            path=self.path,
            raw=self.raw,
            montage=self.montage,
            events=self.events,
            event_id=self.event_id,
            epochs=self.epochs,
            evoked=self.evoked
        )
        LOGGER.info(f'Current progress: {progress}')

    def load_raw(self):
        try:
            raw = mne.io.read_raw(self.path)
            mapping = {}
            for n in raw.info.ch_names:
                mapping[n] = n.upper()
            raw.rename_channels(mapping)
            self.raw = raw
            LOGGER.debug(f'Loaded {raw}')
            self.check_progress()
            return raw

        except Exception as err:
            LOGGER.error(f'Failed to load raw ({self.path}): {err}')
            eb.on_error(err)

        return None

    def fix_montage(self, montage_name: str = 'standard_1020', rename_channels: dict = None):
        def _reset_montage(montage_name, rename_channels):
            montage = mne.channels.make_standard_montage(montage_name)

            if rename_channels is not None:
                montage.rename_channels(rename_channels)
                LOGGER.debug(f'Renamed channels: {rename_channels}')

            mapping = {}
            for n in montage.ch_names:
                mapping[n] = n.upper()
            montage.rename_channels(mapping)

            self.montage = montage

            self.raw.set_montage(montage, on_missing='warn')
            LOGGER.debug('Reset montage to raw')

            return montage

        try:
            assert self.raw is not None, 'Failed fix_montage, since raw is invalid.'
            return _reset_montage(montage_name, rename_channels)

        except Exception as err:
            LOGGER.error(f'Failed to use the correct montage: {err}')
            eb.on_error(err)

        return None


# %% ---- 2023-11-23 ------------------------
# Play ground


# %% ---- 2023-11-23 ------------------------
# Pending


# %% ---- 2023-11-23 ------------------------
# Pending
