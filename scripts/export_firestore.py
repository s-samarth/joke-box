"""One-off: export your data from the old Bit Vault (Firestore) to a JSON file.

firebase-admin is not a project dependency; uv fetches it just for this run:

    uv run --with firebase-admin scripts/export_firestore.py \
        --key ~/Downloads/bit-vault-service-account.json --email you@gmail.com \
        --out ~/bitvault-export.json

Get the key from Firebase console > Project settings > Service accounts > Generate new private key.
Keep the key and the export out of this repo: they contain secrets and your real material.
"""

import argparse
import json
from pathlib import Path

import firebase_admin  # type: ignore[import-not-found]
from firebase_admin import auth, credentials, firestore  # type: ignore[import-not-found]

COLLECTIONS = ["topics", "venues", "bits", "brainstorms", "logs", "setlists"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--key", type=Path, required=True, help="service account JSON")
    parser.add_argument("--email", required=True, help="the account to export")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    firebase_admin.initialize_app(credentials.Certificate(str(args.key.expanduser())))
    uid = auth.get_user_by_email(args.email).uid
    db = firestore.client()
    export = {}
    for name in COLLECTIONS:
        docs = db.collection(name).where("uid", "==", uid).stream()
        export[name] = [doc.to_dict() | {"id": doc.id} for doc in docs]
        print(f"{name}: {len(export[name])}")
    args.out.expanduser().write_text(json.dumps(export, indent=1, default=str))
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
