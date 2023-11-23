"""
File: main.py
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
from util import LOGGER
from util.phase_1st_load_raw import LoadRaw


# %% ---- 2023-11-23 ------------------------
# Function and class


# %% ---- 2023-11-23 ------------------------
# Play ground
if __name__ == '__main__':
    LOGGER.debug('Started')
    lr = LoadRaw('D:\\suyuan\\data\\data-1.cnt')
    lr.load_raw()
    lr.fix_montage()
    print(lr.raw.info)
    print(lr.montage.ch_names)
    LOGGER.debug('Closed')


# %% ---- 2023-11-23 ------------------------
# Pending


# %% ---- 2023-11-23 ------------------------
# Pending
