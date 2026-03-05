"""Backward-compatibility shim – delegates everything to the ``rice`` package.

All existing imports such as::

    from rice_analyzer import rice_router
    from rice_analyzer import _build_semantic_corpus, _SEMANTIC_OK

continue to work because ``rice/__init__.py`` re-exports every public symbol.
"""

from rice import *  # noqa: F401, F403
