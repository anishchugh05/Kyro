"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Centralised logging configuration.
All modules should call setup_logger(__name__) and use the returned logger.
Never log API keys, tokens, user code, or repository contents.
"""
import logging
import sys


def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # Already configured — avoid duplicate handlers

    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(name)-28s | %(levelname)-8s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    logger.addHandler(handler)
    logger.propagate = False
    return logger
