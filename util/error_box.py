"""
File: error_box.py
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
import time
import traceback
from . import LOGGER, CONF, singleton


# %% ---- 2023-11-23 ------------------------
# Function and class
@singleton
class ErrorBox(object):
    buffer = []

    def __init__(self):
        pass

    def on_error(self, err, detail=None):
        t = time.time()
        if detail is None:
            detail = traceback.format_exc()
        self.buffer.append(dict(t=t, err=err, detail=detail))


eb = ErrorBox()

# %% ---- 2023-11-23 ------------------------
# Play ground


# %% ---- 2023-11-23 ------------------------
# Pending


# %% ---- 2023-11-23 ------------------------
# Pending
