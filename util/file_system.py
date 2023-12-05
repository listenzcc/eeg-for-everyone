"""
File: file_system.py
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
import os
import pandas as pd

from pathlib import Path
from tqdm.auto import tqdm

from . import LOGGER, _folders, singleton
from .experiments import Experiments

# %% ---- 2023-12-04 ------------------------
# Function and class
experiments = Experiments()


class BaseFileSystem(object):
    cache_root = _folders["cache_root"]
    data_root = _folders["data_root"]

    def __init__(self):
        LOGGER.debug(f"Initialized file system obj: {self.__class__}")

    def touch(self, file_relative_path: Path):
        p = self.cache_root.joinpath(file_relative_path)
        if not p.is_file():
            LOGGER.warning(
                f"Not existing file path {p}, will make it parent: {p.parent}"
            )
        p.parent.mkdir(exist_ok=True, parents=True)
        return p


def _guess_experiment_by_relative_path(relative_path: Path):
    # It is safe because the last parents is always '.'
    pattern = list(relative_path.parents)[-2].name

    if pattern in experiments:
        LOGGER.debug(f"Found experiment: {pattern} | {relative_path}")
        return pattern

    return "na"


@singleton
class ZccFileSystem(BaseFileSystem):
    found_data_files = []
    df = None

    def __init__(self):
        super(BaseFileSystem, self).__init__()
        self.search_data()

    def search_data(self, exts: list = None, using_existing_df: bool = True):
        if using_existing_df and self.df is not None:
            return self.df

        if exts is None:
            exts = ["data.bdf"]

        files = list(os.walk(self.data_root))
        data_files = []
        for f in tqdm(files, "List data"):
            parent = f[0]
            names = [e for e in f[2] if any(e.endswith(ext) for ext in exts)]
            data_files.extend([Path(parent, e) for e in names])

        self.found_data_files = data_files
        LOGGER.debug(f"Found data files: {data_files}")

        df = pd.DataFrame(data_files, columns=["path"])
        df["experiment"] = df["path"].map(
            lambda e: _guess_experiment_by_relative_path(e.relative_to(self.data_root))
        )
        self.df = df
        LOGGER.debug("Built data frame")

        return df


# %% ---- 2023-12-04 ------------------------
# Play ground


# %% ---- 2023-12-04 ------------------------
# Pending


# %% ---- 2023-12-04 ------------------------
# Pending
