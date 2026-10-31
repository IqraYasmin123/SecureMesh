"""
Audit Trail — Tamper-Evident Hash Chain (Module I)
Each record hashes its own content + previous_hash using SHA-256.
"""
import hashlib
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import AuditRecord

GENESIS_HASH = "0" * 64

def _canonical(record_data: dict) -> str:
    return json.dumps(record_data, sort_keys=True, default=str)

def _sha256(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

def get_last_hash(db: Session) -> str:
    last = db.query(AuditRecord).order_by(AuditRecord.id.desc()).first()
    return last.current_hash if last else GENESIS_HASH

def write_audit(
    db: Session,
    actor: str,
    action: str,
    object_id: str = None,
    details: dict = None,
) -> AuditRecord:
    previous_hash = get_last_hash(db)
    timestamp = datetime.utcnow()

    content = {
        "actor": actor,
        "action": action,
        "object_id": object_id,
        "details": details or {},
        "timestamp": timestamp.isoformat(),
        "previous_hash": previous_hash,
    }
    current_hash = _sha256(_canonical(content))

    record = AuditRecord(
        timestamp=timestamp,
        actor=actor,
        action=action,
        object_id=str(object_id) if object_id else None,
        details=details or {},
        previous_hash=previous_hash,
        current_hash=current_hash,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

def verify_audit_chain(db: Session) -> dict:
    records = db.query(AuditRecord).order_by(AuditRecord.id.asc()).all()
    if not records:
        return {"valid": True, "records_checked": 0, "message": "No audit records found."}

    previous_hash = GENESIS_HASH
    for i, rec in enumerate(records):
        if rec.previous_hash != previous_hash:
            return {
                "valid": False,
                "records_checked": i + 1,
                "first_mismatch": rec.id,
                "message": f"Chain break at record ID {rec.id}: previous_hash mismatch.",
            }

        content = {
            "actor": rec.actor,
            "action": rec.action,
            "object_id": rec.object_id,
            "details": rec.details or {},
            "timestamp": rec.timestamp.isoformat(),
            "previous_hash": rec.previous_hash,
        }
        expected_hash = _sha256(_canonical(content))
        if rec.current_hash != expected_hash:
            return {
                "valid": False,
                "records_checked": i + 1,
                "first_mismatch": rec.id,
                "message": f"Hash mismatch at record ID {rec.id}: content may have been modified.",
            }

        previous_hash = rec.current_hash

    return {
        "valid": True,
        "records_checked": len(records),
        "message": f"Audit chain verified: all {len(records)} records are intact.",
    }
