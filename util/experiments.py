"""
File: experiments.py
Author: Chuncheng Zhang
Date: 2023-12-04
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


# %% ---- 2023-12-04 ------------------------
# Requirements and constants
import io
import pandas as pd

from . import LOGGER


# %% ---- 2023-12-04 ------------------------
# Function and class
class BaseExperiment(dict):
    ignore_attrs = dir(dict)  # Ignore dict's built-in attributes

    def __init__(self):
        self.ignore_attrs.extend(["ignore_attrs"])
        super(dict, self).__init__()

    def update(self):
        for e in dir(self):
            if e in self.ignore_attrs:
                continue
            if e.startswith("__"):
                continue
            self[e] = eval(f"self.{e}")


class RSVP(BaseExperiment):
    name = "RSVP"
    detail = "快速序列视觉呈现实验"

    def __init__(self):
        super().__init__()
        self.update()


class MI(BaseExperiment):
    name = "MI"
    detail = "运动想象实验"
    contrib = "郑骊"

    def __init__(self):
        super().__init__()
        self.update()


class SSVEP(BaseExperiment):
    name = "SSVEP"
    detail = "稳态序列视觉诱发呈现实验"
    contrib = "邱爽"

    def __init__(self):
        super().__init__()
        self.update()


class Experiments(dict):
    experiments = [RSVP, MI, SSVEP]

    def __init__(self):
        super().__init__()
        self.load_experiments()
        LOGGER.debug(f"Initialized {self.__class__}")

    def load_experiments(self):
        for e in self.experiments:
            setup = e()
            self[setup.name] = setup
            LOGGER.debug(f"Initialized {setup.name} setup: {setup}")

    def to_csv(self):
        df = pd.DataFrame(list(self.values()))
        stream = io.StringIO()
        df.to_csv(stream)
        print(stream.getvalue())
        return stream.getvalue()


# %% ---- 2023-12-04 ------------------------
# Play ground


# %% ---- 2023-12-04 ------------------------
# Pending


# %% ---- 2023-12-04 ------------------------
# Pending
