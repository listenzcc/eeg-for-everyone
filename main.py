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
import pandas as pd

from rich import print, inspect
from util import LOGGER
from util.phase_1st_load_raw import LoadRaw


# %% ---- 2023-11-23 ------------------------
# Function and class


# %% ---- 2023-11-23 ------------------------
# Play ground
if __name__ == '__main__':
    LOGGER.debug('Started')
    lr = LoadRaw(
        'D:\\脑机接口专项\\MI\\S1\\liuyanbing-S1-20230523-Session1-6block-QLU')
    lr = LoadRaw('D:\脑机接口专项\SSVEP数据\丁冬梅\ssvep')
    lr.load_raw()
    lr.fix_montage()
    lr.get_events()
    lr.check_progress()
    LOGGER.debug('Closed')


# %% ---- 2023-11-23 ------------------------
# Pending
buffer = []
for name, dig in zip(lr.montage.ch_names, lr.montage.dig):
    rec = [name]
    values = list(dig.values())
    print([name] + values)
    rec = [name]
    rec.extend(values[0])
    buffer.append(rec)
df = pd.DataFrame(buffer, columns=['name', 'x', 'y', 'z'])
df.to_csv('asset/montage/pos.csv')
print(df)

# %% ---- 2023-11-23 ------------------------
# Pending

# %%
