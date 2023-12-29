"""
File: doc.py
Author: Chuncheng Zhang
Date: 2023-12-29
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    Error code book for inner data

Functions:
    1. Requirements and constants
    2. Function and class
    3. Play ground
    4. Pending
    5. Pending
"""


# %% ---- 2023-12-29 ------------------------
# Requirements and constants
from enum import Enum


# %% ---- 2023-12-29 ------------------------
# Function and class


class ZccErrorCode(Enum):
    SHOULD_NOT_NONE = 101
    INVALID_ATTR = 102
    FAIL_PROCESSING = 201
    OTHERS = 301


# %% ---- 2023-12-29 ------------------------
# Play ground
if __name__ == "__main__":
    zec = ZccErrorCode
    print(zec.SHOULD_NOT_NONE)
    print(zec.INVALID_ATTR)


# %% ---- 2023-12-29 ------------------------
# Pending


# %% ---- 2023-12-29 ------------------------
# Pending
