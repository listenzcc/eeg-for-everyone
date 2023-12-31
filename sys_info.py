"""
File: sys_info.py
Author: Chuncheng Zhang
Date: 2023-11-23
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    Test and list required modules and assets.

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
import rich
import tqdm
import numpy
import pandas
import loguru
import pathlib

from types import ModuleType

from rich import print, inspect


# %% ---- 2023-11-23 ------------------------
# Function and class


# %% ---- 2023-11-23 ------------------------
# Play ground
if __name__ == '__main__':
    modules = [eval(e) for e in dir()]
    modules = [e for e in modules if isinstance(e, ModuleType)]
    for m in modules:
        print(m)


# %% ---- 2023-11-23 ------------------------
# Pending


# %% ---- 2023-11-23 ------------------------
# Pending
