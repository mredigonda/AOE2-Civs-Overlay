# tesseract_locator.py
import os, shutil, getpass, subprocess


def find_tesseract():
    # 1) Respect explicit override
    p = os.environ.get("TESSERACT_EXE")
    if p and os.path.isfile(p):
        print(f"Found Tesseract via TESSERACT_EXE: {p}")
        return p

    # 2) If already on PATH
    p = shutil.which("tesseract")
    if p:
        print(f"Found Tesseract on PATH: {p}")
        return p

    # 3) Common install locations (UB-Mannheim, Scoop, Chocolatey, portable)
    user = os.environ.get("USERNAME") or getpass.getuser()
    candidates = [
        rf"C:\Program Files\Tesseract-OCR\tesseract.exe",
        rf"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        rf"C:\Users\{user}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
        rf"C:\Users\{user}\scoop\apps\tesseract\current\tesseract.exe",
        rf"C:\ProgramData\chocolatey\bin\tesseract.exe",
        rf"{os.getcwd()}\vendor\Tesseract-OCR\tesseract.exe",  # project-local copy, if you ship one
    ]

    print("Searching for Tesseract in common locations...")
    for c in candidates:
        if os.path.isfile(c):
            print(f"Found Tesseract: {c}")
            return c
        else:
            print(f"  Not found: {c}")

    # 4) Fallback: ask Windows where.exe (works from Git Bash)
    try:
        print("Trying Windows 'where' command...")
        out = subprocess.check_output(
            [r"C:\Windows\System32\where.exe", "tesseract"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        first = out.splitlines()[0].strip()
        if os.path.isfile(first):
            print(f"Found Tesseract via 'where': {first}")
            return first
    except Exception as e:
        print(f"Windows 'where' command failed: {e}")

    raise FileNotFoundError(
        "tesseract.exe not found. Set TESSERACT_EXE to the full path, "
        "or install Tesseract and rerun."
    )


def setup_tesseract_environment():
    """Find Tesseract and set up environment variables"""
    try:
        tesseract_path = find_tesseract()

        # Set environment variables for tesserocr
        tesseract_dir = os.path.dirname(tesseract_path)
        tessdata_dir = os.path.join(tesseract_dir, "tessdata")

        # Set environment variables
        os.environ["TESSERACT_EXE"] = tesseract_path
        os.environ["TESSDATA_PREFIX"] = tessdata_dir

        # Add to PATH if not already there
        if tesseract_dir not in os.environ.get("PATH", ""):
            current_path = os.environ.get("PATH", "")
            os.environ["PATH"] = f"{tesseract_dir};{current_path}"

        print(f"Tesseract environment set up:")
        print(f"  TESSERACT_EXE: {tesseract_path}")
        print(f"  TESSDATA_PREFIX: {tessdata_dir}")
        print(f"  Added to PATH: {tesseract_dir}")

        return True

    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        return False


if __name__ == "__main__":
    try:
        tesseract_path = find_tesseract()
        print(f"\n✅ Tesseract found at: {tesseract_path}")

        # Test if it works
        result = subprocess.run(
            [tesseract_path, "--version"], capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"✅ Tesseract version: {result.stdout.strip()}")
        else:
            print(f"⚠️ Tesseract found but version check failed: {result.stderr}")

    except FileNotFoundError as e:
        print(f"\n❌ {e}")
        print("\nInstallation options:")
        print("1. Download from: https://github.com/UB-Mannheim/tesseract/wiki")
        print("2. Use Chocolatey: choco install tesseract")
        print("3. Use winget: winget install UB-Mannheim.TesseractOCR")
        print("4. Use Scoop: scoop install tesseract")
