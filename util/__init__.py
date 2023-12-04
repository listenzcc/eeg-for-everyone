"""
File: __init__.py
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

from loguru import logger

from enum import Enum
from pathlib import Path
from datetime import datetime
from omegaconf import OmegaConf

from dataclasses import dataclass

# %%
root = Path(__file__).parent.parent

_folders = dict(
    log=root.joinpath("log"),
    cache_root=root.joinpath("filesystem"),
    data_root=Path("D:\脑机接口专项"),
)

[v.mkdir(exist_ok=True) for k, v in _folders.items()]

# %% ---- 2023-11-23 ------------------------
# Function and class


def init_logger():
    now = datetime.now()  # current date and time
    date_time = now.strftime("%Y-%m-%d-%H-%M-%S")
    logger.add(_folders["log"].joinpath(f"{date_time}.log"))
    return logger


LOGGER = init_logger()


def singleton(cls, *args, **kw):
    instances = {}

    def _singleton(*args, **kw):
        if cls not in instances:
            instances[cls] = cls(*args, **kw)
        else:
            LOGGER.debug(f"Using existing instance: {instances[cls]}")

        return instances[cls]

    return _singleton


# %%
# CONF
@dataclass
class Project:
    _name: str = "EEG for everyone"
    _version: str = "0.1"
    _author: str = "Chuncheng Zhang"


@dataclass
class Runtime(Project):
    today: str = datetime.now()
    folder: str = str(_folders)


class AllowedProtocol(Enum):
    MI = 1
    SSVEP = 2
    P300 = 3


@dataclass
class Dynamic(Runtime):
    username: str = "No one"
    fs: int = 1000  # Hz
    protocol: AllowedProtocol = AllowedProtocol.MI


CONF = OmegaConf.structured(Dynamic)
LOGGER.debug(f"Started with {CONF}")

# %% ---- 2023-11-23 ------------------------
# Play ground


# %% ---- 2023-11-23 ------------------------
# Pending


# %% ---- 2023-11-23 ------------------------
# Pending
