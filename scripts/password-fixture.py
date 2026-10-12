"""Optional fixture regeneration: pip install pypdf (not a runtime dependency)."""
from pathlib import Path
from pypdf import PdfReader, PdfWriter

root = Path(__file__).resolve().parent.parent
writer = PdfWriter()
writer.append(PdfReader(root / "tests/fixtures/magazine.pdf"))
writer.encrypt("folio-test")
writer.write(root / "tests/fixtures/password.pdf")
