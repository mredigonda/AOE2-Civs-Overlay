#!/bin/bash
# Builds the overlay for Windows on this Mac (cross-compiled): one self-contained
# aoe2-civs-overlay.exe, which game-mod/serve.py serves and the mod's installer
# (.bat) copies into %LOCALAPPDATA%\AoE2 Civs Overlay and starts.
#
# One-time setup (2026-11-19):
#   rustup target add x86_64-pc-windows-msvc
#   brew install llvm lld
#   cargo install --locked cargo-xwin
# The first build downloads Microsoft's C runtime and Windows SDK (cargo-xwin, a few
# hundred MB, cached in ~/Library/Caches/cargo-xwin). Later builds only recompile
# what changed.
#
# No installer: Homebrew's makensis (3.13) crashes on this macOS (std::bad_alloc,
# even on an empty script), and the .exe alone is all the PC needs. Not a release.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/opt/llvm/bin:/opt/homebrew/opt/lld/bin:$PATH"
npx tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc --no-bundle
ls -la src-tauri/target/x86_64-pc-windows-msvc/release/aoe2-civs-overlay.exe
