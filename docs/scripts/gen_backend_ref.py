"""Auto-generate backend API reference pages for MkDocs.

This script is executed by the ``mkdocs-gen-files`` plugin during the MkDocs
build.  It walks the ``backend/app/`` source tree, discovers every Python
module, and emits a corresponding ``.md`` reference page that uses the
``mkdocstrings`` ``::: module.path`` directive to pull in the docstrings.

It also writes a ``SUMMARY.md`` that ``mkdocs-literate-nav`` uses to build
the navigation tree for the *Backend API Reference* section.

Run indirectly via::

    mkdocs build   # or: mkdocs serve
"""

from __future__ import annotations

import sys
from pathlib import Path

import mkdocs_gen_files

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# docs/ is the working directory when mkdocs-gen-files runs this script.
# The backend source lives two levels up at portfolio/backend/.
DOCS_ROOT = Path(__file__).parent.parent  # portfolio/docs/
BACKEND_SRC = DOCS_ROOT.parent / "backend" / "app"

# The output section inside the MkDocs docs/ tree
OUTPUT_PREFIX = "backend"

# Modules to skip entirely (auto-generated, empty inits, cache dirs)
SKIP_PATTERNS: set[str] = {
    "__pycache__",
    "__init__",
    "*.pyc",
}

# Modules that contain no public API worth documenting
SKIP_MODULES: set[str] = {
    "app",  # top-level __init__
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _is_skipped(path: Path) -> bool:
    """Return True if *path* should be excluded from the reference docs."""
    name = path.stem
    if name.startswith("_") and name != "__init__":
        return True
    if name in SKIP_PATTERNS or name in SKIP_MODULES:
        return True
    if path.suffix != ".py":
        return True
    if any(part.startswith("_") and part != "app" for part in path.parts):
        # Skip hidden/dunder directories (e.g. __pycache__)
        return True
    return False


def _module_path(py_file: Path) -> str:
    """Convert a filesystem path to a dotted Python module path.

    Example::

        Path("app/services/project_service.py") -> "app.services.project_service"
    """
    relative = py_file.relative_to(BACKEND_SRC.parent)
    parts = list(relative.with_suffix("").parts)
    return ".".join(parts)


def _doc_path(py_file: Path) -> Path:
    """Map a Python source path to its output .md path inside docs/.

    Example::

        app/services/project_service.py
        -> backend/services/project_service.md
    """
    relative = py_file.relative_to(BACKEND_SRC)
    return Path(OUTPUT_PREFIX) / relative.with_suffix(".md")


# ---------------------------------------------------------------------------
# Main generation loop
# ---------------------------------------------------------------------------


def generate() -> None:
    """Walk ``backend/app/`` and emit one reference page per module."""

    nav = mkdocs_gen_files.Nav()

    py_files: list[Path] = sorted(BACKEND_SRC.rglob("*.py"))

    for py_file in py_files:
        if _is_skipped(py_file):
            continue

        module = _module_path(py_file)
        doc_path = _doc_path(py_file)

        # Build nav section tuple from the file's path components
        # e.g. ("Services", "project_service") -> backend/services/project_service.md
        relative_to_app = py_file.relative_to(BACKEND_SRC)
        parts = list(relative_to_app.with_suffix("").parts)

        # Humanise the nav labels (title-case, replace underscores)
        nav_parts = [p.replace("_", " ").title() for p in parts]
        nav[nav_parts] = doc_path.as_posix()

        # Emit the reference page
        with mkdocs_gen_files.open(doc_path, "w") as f:
            f.write(f"# `{parts[-1]}`\n\n")
            f.write(f":::{module}\n")
            f.write("    options:\n")
            f.write("      show_root_heading: true\n")
            f.write("      show_source: true\n")

        mkdocs_gen_files.set_edit_path(doc_path, py_file.relative_to(DOCS_ROOT.parent))

    # Write the SUMMARY.md consumed by mkdocs-literate-nav
    with mkdocs_gen_files.open(f"{OUTPUT_PREFIX}/SUMMARY.md", "w") as nav_file:
        nav_file.writelines(nav.build_literate_nav())


if __name__ == "__main__":
    # Allow running directly for debugging:  python scripts/gen_backend_ref.py
    sys.exit(generate() or 0)  # type: ignore[func-returns-value]


generate()
