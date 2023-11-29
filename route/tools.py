"""
File: tools.py
Author: Chuncheng Zhang
Date: 2023-11-29
Copyright & Email: chuncheng.zhang@ia.ac.cn

Purpose:
    Useful tools for fastapi routing.

Functions:
    1. Requirements and constants
    2. Function and class
    3. Play ground
    4. Pending
    5. Pending
"""


# %% ---- 2023-11-29 ------------------------
# Requirements and constants
import time
import random

from hashlib import md5


# %% ---- 2023-11-29 ------------------------
# Function and class

def unique_md5(seed='seed'):
    """
Generates a unique MD5 hash based on the current time, a seed, and a random number.

Args:
    seed (str): The seed value to include in the hash. Defaults to 'seed'.

Returns:
    str: The generated MD5 hash, in uppercase.

Examples:
    >>> unique_md5()
    'F4D7A3B9E5C2'
    >>> unique_md5('abc')
    '1A2B3C4D5E6F'
"""

    return md5(f'{time.time()}|{seed}|{random.random()}'.encode()).hexdigest().upper()


# %% ---- 2023-11-29 ------------------------
# Play ground
if __name__ == '__main__':
    print(unique_md5())


# %% ---- 2023-11-29 ------------------------
# Pending


# %% ---- 2023-11-29 ------------------------
# Pending
