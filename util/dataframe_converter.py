"""
File: dataframe_converter.py
Author: Chuncheng Zhang
Date: 2023-12-05
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    Amazing things
    Tools of converting dataframe into other formats.

Functions:
    1. Requirements and constants
    2. Function and class
    3. Play ground
    4. Pending
    5. Pending
"""


# %% ---- 2023-12-05 ------------------------
# Requirements and constants
import io


# %% ---- 2023-12-05 ------------------------
# Function and class


def df2csv(df):
    stream = io.StringIO()
    df.to_csv(stream)
    return stream.getvalue()


def df2json(df):
    stream = io.StringIO()
    df.to_json(stream)
    return stream.getvalue()


# %% ---- 2023-12-05 ------------------------
# Play ground


# %% ---- 2023-12-05 ------------------------
# Pending


# %% ---- 2023-12-05 ------------------------
# Pending
