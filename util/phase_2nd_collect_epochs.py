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

    def compute_tfr_morlet(
        self,
        sensor_name: str,
        event_label: str,
        n_cycles: float = 4.0,
        segments: int = 16,
    ):
        epochs = self.epochs.copy().pick([sensor_name])[event_label]
        LOGGER.debug(f"Compute tfr_morlet for epochs: {epochs}, {epochs.ch_names}")

        # Compute the min frequency the epochs support
        # Ref: https://mne.tools/stable/generated/mne.time_frequency.tfr_morlet.html#mne.time_frequency.tfr_morlet
        freq_min = np.ceil(
            (5 / np.pi) / (len(epochs.times) + 1) * n_cycles * epochs.info["sfreq"]
        )
        freq_max = np.max([freq_min * 2, epochs.info["lowpass"]])
        freqs = np.linspace(freq_min, freq_max, segments)
        LOGGER.debug(f"Using freq range: {freq_min}, {freq_max}, {freqs}")

        tfr_epochs = mne.time_frequency.tfr_morlet(
            epochs, freqs, n_cycles=n_cycles, average=False, return_itc=False, n_jobs=16
        )
        times = epochs.times
        tfr_epochs.apply_baseline(baseline=(times[0], 0))
        data = tfr_epochs.data
        averaged_data = tfr_epochs.average().data.squeeze()
        LOGGER.debug(
            f"Computed tfr_morlet: {tfr_epochs} | epochs x chs x freqs x times: {data.shape} | freqx x times: {averaged_data.shape}"
        )

        return tfr_epochs, averaged_data, freqs, times

    def collect_epochs(
        self, events, event_id, tmin, tmax, l_freq, h_freq, decim, timestamp=None
    ) -> mne.Epochs:
        """
        Collects epochs from the raw data based on specified events.

        Args:
            events: A list of event codes to include.
            event_id: A dictionary mapping event names to event codes.
            tmin: The start time of each epoch in seconds.
            tmax: The end time of each epoch in seconds.
            l_freq: The lower frequency bound for the bandpass filter.
            h_freq: The upper frequency bound for the bandpass filter.
            decim: The decimation factor for downsampling the epochs.
            timestamp: The timestamp of the current computation (optional).

        Returns:
            The collected epochs.

        Raises:
            AssertionError: If the raw data is invalid.

        Examples:
            >>> events = [1, 2, 3]
            >>> event_id = {'event1': 1, 'event2': 2, 'event3': 3}
            >>> tmin = 0.0
            >>> tmax = 1.0
            >>> l_freq = 1.0
            >>> h_freq = 40.0
            >>> decim = 10
            >>> epochs = collect_epochs(events, event_id, tmin, tmax, l_freq, h_freq, decim)
        """
        # Reset following objects since the new epochs are loading
        self.epochs = None
        self.evoked = None

        assert self.raw is not None, "Failed collect_epochs, since raw is invalid."

        # Only use event_id inside the events
        event_id = {k: v for k, v in event_id.items() if v in events}

        # Convert events from array of N numbers into shape (N, 3) events record
        events = [e for e in self.events if e[2] in events]

        kwargs = dict(
            events=events,
            event_id=event_id,
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
