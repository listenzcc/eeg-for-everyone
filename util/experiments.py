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
from . import LOGGER


# %% ---- 2023-12-04 ------------------------
# Function and class
class RSVP(object):
    name = "RSVP"
    detail = "快速序列视觉呈现实验"

    def __init__(self):
        pass


class MI(object):
    name = "MI"
    detail = "运动想象实验"

    def __init__(self):
        pass


class SSVEP(object):
    name = "SSVEP"
    detail = "稳态序列视觉诱发呈现实验"

    def __init__(self):
        pass


class Experiments(dict):
    experiments = [RSVP, MI, SSVEP]

    def __init__(self):
        super(dict, self).__init__()
        self.load_experiments()
        LOGGER.debug(f"Initialized {self.__class__}")

    def load_experiments(self):
        for e in self.experiments:
            setup = e()
            self[setup.name] = setup
            LOGGER.debug(f"Initialized {setup.name} setup: {setup}")


# %% ---- 2023-12-04 ------------------------
# Play ground


# %% ---- 2023-12-04 ------------------------
# Pending


# %% ---- 2023-12-04 ------------------------
# Pending
