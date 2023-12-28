"""
File: my-mne.py
Author: Chuncheng Zhang
Date: 2023-12-28
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


# %% ---- 2023-12-28 ------------------------
# Requirements and constants
import mne
import pandas as pd
from rich import print, inspect


# %% ---- 2023-12-28 ------------------------
# Function and class
montage = mne.channels.make_standard_montage("standard_1020")
inspect(montage)


# %% ---- 2023-12-28 ------------------------
# Play ground
digs = [list(e.values()) for e in montage.dig if list(e.values())[2] == 3]
digs

montage.ch_names

data = [
    dict(name=name.upper(), x=dig[0][0], y=dig[0][1], z=dig[0][2])
    for dig, name in zip(digs, montage.ch_names)
]
print(data)

df = pd.DataFrame(data)
df.to_csv("sensors.csv")
print(df)

# %% ---- 2023-12-28 ------------------------
# Pending


# %% ---- 2023-12-28 ------------------------
# Pending
