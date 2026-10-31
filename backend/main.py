"""
SecureMesh FastAPI Backend — Main Application
"""
import io
import csv
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from config import get_settings
from models import (
    init_db, get_db, User, SecurityEvent, RiskAssessment, Alert,
    FileRecord, Asset, AssetEdge, AuditRecord, Incident, IncidentNote, ApplicationSetting
)
from auth_utils import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_permission, is_account_locked, ROLE_PERMISSIONS
)
from risk_engine import calculate_risk, RiskInput, DEFAULT_WEIGHTS, validate_weights
from zero_trust import evaluate_zero_trust
from crypto_ops import encrypt_file, decrypt_file, verify_integrity, sha256_hash, get_demo_key
from audit import write_audit, verify_audit_chain
from threat_detection import run_detection
from seed_data import seed_demo_data

settings = get_settings()

app = FastAPI(title="SecureMesh API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    init_db()
    db = next(get_db())
    try:
        seed_demo_data(db, reset=False)
    finally:
        db.close()

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "viewer"

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3 or len(v) > 32:
            raise ValueError("Username must be 3-32 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (hyphens/underscores allowed)")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v):
        if v not in ("admin", "analyst", "viewer"):
            raise ValueError("Role must be admin, analyst, or viewer")
        return v

class LoginRequest(BaseModel):
    username: str
    password: str

class RiskScoreRequest(BaseModel):
    identity_risk: float
    anomaly_score: float
    asset_criticality: float
    policy_violation: float
    weights: Optional[dict] = None

class ZeroTrustRequest(BaseModel):
    action: str
    asset_criticality: float = 0.5
    identity_risk: float = 0.0
    anomaly_score: float = 0.0
    policy_violation: float = 0.0

class AlertUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = None

class IncidentUpdateRequest(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assigned_to: Optional[str] = None
    summary: Optional[str] = None

class IncidentNoteRequest(BaseModel):
    content: str

class SettingsUpdateRequest(BaseModel):
    risk_weight_identity: Optional[float] = None
    risk_weight_anomaly: Optional[float] = None
    risk_weight_criticality: Optional[float] = None
    risk_weight_policy: Optional[float] = None
    allow_threshold: Optional[float] = None
    step_up_threshold: Optional[float] = None

def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "permissions": list(ROLE_PERMISSIONS.get(user.role, set())),
    }

# ─── Auth Routes ──────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Only admins can create admin users — enforced via open registration for demo
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        role=req.role if req.role != "admin" else "viewer",  # Prevent self-escalation
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    write_audit(db, req.username, "user_registered", str(user.id), {"email": req.email, "role": user.role})
    return {"message": "User registered successfully", "user": user_to_dict(user)}

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if is_account_locked(user):
        raise HTTPException(status_code=429, detail=f"Account locked. Try again after {user.locked_until.strftime('%H:%M UTC')}")

    if not verify_password(req.password, user.hashed_password):
        user.failed_logins = (user.failed_logins or 0) + 1
        if user.failed_logins >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
        db.commit()

        # Log failed event
        ev = SecurityEvent(
            event_type="login_failure",
            severity="medium",
            username=req.username,
            description=f"Failed login attempt for user {req.username}",
            is_synthetic=False,
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        run_detection(db, ev)

        write_audit(db, req.username, "login_failed", str(user.id), {"failed_count": user.failed_logins})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Success
    user.failed_logins = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": user.username, "role": user.role})

    ev = SecurityEvent(
        event_type="login_success",
        severity="low",
        username=req.username,
        description=f"Successful login for user {req.username}",
        is_synthetic=False,
    )
    db.add(ev)
    db.commit()
    write_audit(db, req.username, "login_success", str(user.id), {})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }

@app.post("/api/auth/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    write_audit(db, current_user.username, "logout", str(current_user.id), {})
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)

# ─── Analytics ────────────────────────────────────────────────────────────────

@app.get("/api/analytics/summary")
def analytics_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_events = db.query(SecurityEvent).count()
    open_alerts = db.query(Alert).filter(Alert.status == "open").count()
    high_risk = db.query(SecurityEvent).filter(SecurityEvent.severity.in_(["high", "critical"])).count()
    protected_assets = db.query(Asset).filter(Asset.is_active == True).count()

    recent_events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(10).all()
    recent_alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(5).all()

    severity_counts = {}
    for sev in ["low", "medium", "high", "critical"]:
        severity_counts[sev] = db.query(SecurityEvent).filter(SecurityEvent.severity == sev).count()

    # Risk trend: last 7 days aggregated by day
    risk_trend = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        events_day = db.query(SecurityEvent).filter(
            SecurityEvent.timestamp >= day_start,
            SecurityEvent.timestamp < day_end,
        ).all()
        avg_risk = sum(e.risk_score for e in events_day if e.risk_score) / max(len(events_day), 1)
        risk_trend.append({
            "date": day.strftime("%m/%d"),
            "avg_risk": round(avg_risk, 1),
            "event_count": len(events_day),
        })

    decision_counts = {}
    for dec in ["ALLOW", "STEP_UP", "DENY"]:
        decision_counts[dec] = db.query(RiskAssessment).filter(RiskAssessment.decision == dec).count()

    return {
        "total_events": total_events,
        "open_alerts": open_alerts,
        "high_risk_events": high_risk,
        "protected_assets": protected_assets,
        "severity_distribution": severity_counts,
        "risk_trend": risk_trend,
        "decision_counts": decision_counts,
        "recent_events": [
            {
                "id": e.id, "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type, "severity": e.severity,
                "username": e.username, "description": e.description,
                "risk_score": e.risk_score, "is_synthetic": e.is_synthetic,
            } for e in recent_events
        ],
        "recent_alerts": [
            {
                "id": a.id, "timestamp": a.timestamp.isoformat(),
                "title": a.title, "severity": a.severity,
                "status": a.status, "risk_score": a.risk_score,
            } for a in recent_alerts
        ],
    }

# ─── Events ──────────────────────────────────────────────────────────────────

@app.get("/api/events")
def get_events(
    skip: int = 0,
    limit: int = 50,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SecurityEvent)
    if severity:
        q = q.filter(SecurityEvent.severity == severity)
    if event_type:
        q = q.filter(SecurityEvent.event_type == event_type)
    total = q.count()
    events = q.order_by(SecurityEvent.timestamp.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "events": [
            {
                "id": e.id, "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type, "severity": e.severity,
                "source_ip": e.source_ip, "username": e.username,
                "description": e.description, "risk_score": e.risk_score,
                "is_synthetic": e.is_synthetic,
            } for e in events
        ],
    }

@app.post("/api/events/demo")
def generate_demo_events(db: Session = Depends(get_db), current_user: User = Depends(require_permission("write"))):
    seed_demo_data(db, reset=True)
    write_audit(db, current_user.username, "demo_events_generated", "database", {})
    return {"message": "Demo security events generated successfully"}

# ─── Alerts ──────────────────────────────────────────────────────────────────

@app.get("/api/alerts")
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Alert)
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    total = q.count()
    alerts = q.order_by(Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "alerts": [
            {
                "id": a.id, "timestamp": a.timestamp.isoformat(),
                "title": a.title, "severity": a.severity,
                "event_id": a.event_id, "risk_score": a.risk_score,
                "detection_reason": a.detection_reason,
                "recommended_response": a.recommended_response,
                "status": a.status, "acknowledged_by": a.acknowledged_by,
                "resolved_by": a.resolved_by,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            } for a in alerts
        ],
    }

@app.patch("/api/alerts/{alert_id}")
def update_alert(
    alert_id: int,
    req: AlertUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("acknowledge_alerts")),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    valid_statuses = {"open", "acknowledged", "resolved", "false_positive"}
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")

    old_status = alert.status
    alert.status = req.status
    if req.status == "acknowledged":
        alert.acknowledged_by = current_user.username
    elif req.status == "resolved":
        alert.resolved_by = current_user.username
        alert.resolved_at = datetime.utcnow()
    db.commit()

    write_audit(db, current_user.username, "alert_updated", str(alert_id),
                {"old_status": old_status, "new_status": req.status, "note": req.note})
    return {"message": "Alert updated", "alert_id": alert_id, "status": req.status}

# ─── Risk Engine ──────────────────────────────────────────────────────────────

@app.post("/api/risk/score")
def score_risk(req: RiskScoreRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        w = validate_weights(req.weights or DEFAULT_WEIGHTS)
        risk_input = RiskInput(
            identity_risk=req.identity_risk,
            anomaly_score=req.anomaly_score,
            asset_criticality=req.asset_criticality,
            policy_violation=req.policy_violation,
        )
        result = calculate_risk(risk_input, w)
        return {
            "score": result.score,
            "category": result.category,
            "decision": result.decision,
            "explanation": result.explanation,
            "recommended_action": result.recommended_action,
            "factors": result.factors,
            "weights": result.weights,
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@app.get("/api/risk/{event_id}")
def get_risk_for_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessment = db.query(RiskAssessment).filter(RiskAssessment.event_id == event_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="No risk assessment for this event")
    return {
        "id": assessment.id,
        "event_id": assessment.event_id,
        "timestamp": assessment.timestamp.isoformat(),
        "identity_risk": assessment.identity_risk,
        "anomaly_score": assessment.anomaly_score,
        "asset_criticality": assessment.asset_criticality,
        "policy_violation": assessment.policy_violation,
        "risk_score": assessment.risk_score,
        "risk_category": assessment.risk_category,
        "decision": assessment.decision,
        "explanation": assessment.explanation,
        "factors": assessment.factors,
    }

# ─── Zero-Trust ───────────────────────────────────────────────────────────────

@app.post("/api/zero-trust/evaluate")
def zero_trust_evaluate(
    req: ZeroTrustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = evaluate_zero_trust(
        action=req.action,
        user_role=current_user.role,
        asset_criticality=req.asset_criticality,
        identity_risk=req.identity_risk,
        anomaly_score=req.anomaly_score,
        policy_violation=req.policy_violation,
    )

    # Record as event
    ev = SecurityEvent(
        event_type="policy_" + result["decision"].lower(),
        severity="high" if result["decision"] == "DENY" else "medium" if result["decision"] == "STEP_UP" else "low",
        username=current_user.username,
        description=result["explanation"],
        risk_score=result["risk_score"],
        is_synthetic=False,
        details={"action": req.action, "decision": result["decision"]},
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    run_detection(db, ev)
    write_audit(db, current_user.username, f"zero_trust_{result['decision'].lower()}", req.action,
                {"risk_score": result["risk_score"], "decision": result["decision"]})

    return result

# ─── Cryptography ─────────────────────────────────────────────────────────────

@app.post("/api/crypto/encrypt")
async def crypto_encrypt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    key = get_demo_key()
    result = encrypt_file(data, key)

    record = FileRecord(
        filename=file.filename,
        operation="encrypt",
        sha256_hash=result["original_sha256"],
        file_size=len(data),
        user_id=current_user.id,
        success=True,
        details=f"AES-256-GCM encrypted. Original SHA-256: {result['original_sha256']}",
    )
    db.add(record)
    db.commit()

    ev = SecurityEvent(
        event_type="file_encrypted",
        severity="low",
        username=current_user.username,
        description=f"File '{file.filename}' encrypted with AES-256-GCM",
        is_synthetic=False,
    )
    db.add(ev)
    db.commit()
    write_audit(db, current_user.username, "file_encrypted", file.filename,
                {"sha256": result["original_sha256"], "size": len(data)})

    return result

@app.post("/api/crypto/decrypt")
async def crypto_decrypt(
    ciphertext: str = Form(...),
    nonce: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    key = get_demo_key()
    try:
        plaintext = decrypt_file(ciphertext, nonce, key)
    except ValueError as e:
        write_audit(db, current_user.username, "decrypt_failed", "file", {"error": str(e)})
        raise HTTPException(status_code=400, detail=str(e))

    result_hash = sha256_hash(plaintext)
    record = FileRecord(
        filename="decrypted_output",
        operation="decrypt",
        sha256_hash=result_hash,
        file_size=len(plaintext),
        user_id=current_user.id,
        success=True,
    )
    db.add(record)
    db.commit()
    write_audit(db, current_user.username, "file_decrypted", "file", {"sha256": result_hash})

    return {
        "plaintext_b64": __import__("base64").b64encode(plaintext).decode(),
        "sha256": result_hash,
        "size": len(plaintext),
        "message": "Decryption successful. Authentication tag verified.",
    }

@app.post("/api/crypto/verify")
async def crypto_verify(
    file: UploadFile = File(...),
    expected_hash: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await file.read()
    result = verify_integrity(data, expected_hash)

    ev = SecurityEvent(
        event_type="integrity_failure" if not result["match"] else "integrity_verified",
        severity="critical" if not result["match"] else "low",
        username=current_user.username,
        description=result["message"],
        is_synthetic=False,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    if not result["match"]:
        run_detection(db, ev)

    write_audit(db, current_user.username, "integrity_check", file.filename,
                {"match": result["match"], "sha256": result["actual_hash"]})
    return result

@app.get("/api/crypto/history")
def crypto_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = db.query(FileRecord).order_by(FileRecord.timestamp.desc()).offset(skip).limit(limit).all()
    total = db.query(FileRecord).count()
    return {
        "total": total,
        "records": [
            {
                "id": r.id, "timestamp": r.timestamp.isoformat(),
                "filename": r.filename, "operation": r.operation,
                "sha256_hash": r.sha256_hash, "file_size": r.file_size,
                "success": r.success, "details": r.details,
            } for r in records
        ],
    }

# ─── Assets & Graph ───────────────────────────────────────────────────────────

@app.get("/api/assets/graph")
def get_asset_graph(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assets = db.query(Asset).filter(Asset.is_active == True).all()
    edges = db.query(AssetEdge).all()

    # NetworkX analysis
    try:
        import networkx as nx
        G = nx.DiGraph()
        asset_map = {a.id: a for a in assets}
        for a in assets:
            G.add_node(a.id, name=a.name, asset_type=a.asset_type, criticality=a.criticality)
        for e in edges:
            G.add_edge(e.source_id, e.target_id, relationship=e.relationship, weight=e.weight)

        centrality = nx.degree_centrality(G)
        betweenness = nx.betweenness_centrality(G)

        nodes = []
        for a in assets:
            nodes.append({
                "id": a.id,
                "name": a.name,
                "asset_type": a.asset_type,
                "criticality": a.criticality,
                "description": a.description,
                "degree_centrality": round(centrality.get(a.id, 0), 4),
                "betweenness_centrality": round(betweenness.get(a.id, 0), 4),
            })

        edge_list = [
            {
                "source": e.source_id,
                "target": e.target_id,
                "relationship": e.relationship,
                "weight": e.weight,
            } for e in edges
        ]

        return {"nodes": nodes, "edges": edge_list, "node_count": len(nodes), "edge_count": len(edge_list)}
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Graph analysis failed: {str(ex)}")

# ─── Audit ────────────────────────────────────────────────────────────────────

@app.get("/api/audit")
def get_audit(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_audit")),
):
    total = db.query(AuditRecord).count()
    records = db.query(AuditRecord).order_by(AuditRecord.timestamp.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "records": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "actor": r.actor,
                "action": r.action,
                "object_id": r.object_id,
                "details": r.details,
                "previous_hash": r.previous_hash,
                "current_hash": r.current_hash,
            } for r in records
        ],
    }

@app.post("/api/audit/verify")
def verify_audit(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_audit")),
):
    result = verify_audit_chain(db)
    write_audit(db, current_user.username, "audit_chain_verified", "audit_log",
                {"valid": result["valid"], "records_checked": result.get("records_checked", 0)})
    return result

# ─── Incidents ────────────────────────────────────────────────────────────────

@app.get("/api/incidents")
def get_incidents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    result = []
    for inc in incidents:
        notes = db.query(IncidentNote).filter(IncidentNote.incident_id == inc.id).all()
        result.append({
            "id": inc.id,
            "title": inc.title,
            "summary": inc.summary,
            "severity": inc.severity,
            "status": inc.status,
            "created_at": inc.created_at.isoformat(),
            "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
            "assigned_to": inc.assigned_to,
            "risk_score": inc.risk_score,
            "recommended_steps": inc.recommended_steps,
            "notes": [
                {"id": n.id, "author": n.author, "content": n.content,
                 "created_at": n.created_at.isoformat()} for n in notes
            ],
        })
    return {"incidents": result}

@app.patch("/api/incidents/{incident_id}")
def update_incident(
    incident_id: int,
    req: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write")),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = inc.status
    if req.status:
        inc.status = req.status
    if req.severity:
        inc.severity = req.severity
    if req.assigned_to:
        inc.assigned_to = req.assigned_to
    if req.summary:
        inc.summary = req.summary
    inc.updated_at = datetime.utcnow()
    db.commit()

    write_audit(db, current_user.username, "incident_updated", str(incident_id),
                {"old_status": old_status, "new_status": inc.status})
    return {"message": "Incident updated"}

@app.post("/api/incidents/{incident_id}/notes")
def add_incident_note(
    incident_id: int,
    req: IncidentNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write")),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    note = IncidentNote(
        incident_id=incident_id,
        author=current_user.username,
        content=req.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    write_audit(db, current_user.username, "incident_note_added", str(incident_id), {"note_id": note.id})
    return {"id": note.id, "author": note.author, "content": note.content, "created_at": note.created_at.isoformat()}

# ─── Reports ──────────────────────────────────────────────────────────────────

@app.get("/api/reports/export")
def export_report(
    format: str = Query("csv", pattern="^(csv|json)$"),
    report_type: str = Query("events", pattern="^(events|alerts|risk|audit)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("export")),
):
    write_audit(db, current_user.username, "report_exported", report_type, {"format": format})

    if report_type == "events":
        rows = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).all()
        data = [
            {
                "id": r.id, "timestamp": r.timestamp.isoformat(),
                "event_type": r.event_type, "severity": r.severity,
                "source_ip": r.source_ip or "", "username": r.username or "",
                "description": r.description, "risk_score": r.risk_score or "",
                "is_synthetic": r.is_synthetic,
            } for r in rows
        ]
    elif report_type == "alerts":
        rows = db.query(Alert).order_by(Alert.timestamp.desc()).all()
        data = [
            {
                "id": r.id, "timestamp": r.timestamp.isoformat(),
                "title": r.title, "severity": r.severity,
                "risk_score": r.risk_score or "", "status": r.status,
                "detection_reason": r.detection_reason,
                "recommended_response": r.recommended_response,
                "acknowledged_by": r.acknowledged_by or "",
                "resolved_by": r.resolved_by or "",
            } for r in rows
        ]
    elif report_type == "risk":
        rows = db.query(RiskAssessment).order_by(RiskAssessment.timestamp.desc()).all()
        data = [
            {
                "id": r.id, "timestamp": r.timestamp.isoformat(),
                "event_id": r.event_id, "risk_score": r.risk_score,
                "risk_category": r.risk_category, "decision": r.decision,
                "identity_risk": r.identity_risk, "anomaly_score": r.anomaly_score,
                "asset_criticality": r.asset_criticality, "policy_violation": r.policy_violation,
                "explanation": r.explanation,
            } for r in rows
        ]
    elif report_type == "audit":
        rows = db.query(AuditRecord).order_by(AuditRecord.timestamp.desc()).all()
        data = [
            {
                "id": r.id, "timestamp": r.timestamp.isoformat(),
                "actor": r.actor, "action": r.action,
                "object_id": r.object_id or "", "current_hash": r.current_hash,
            } for r in rows
        ]

    if format == "json":
        content = json.dumps(data, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=securemesh_{report_type}.json"}
        )
    else:
        output = io.StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=securemesh_{report_type}.csv"}
        )

# ─── Settings ─────────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings_api(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings_rows = db.query(ApplicationSetting).all()
    return {
        "settings": [
            {"key": s.key, "value": s.value, "description": s.description} for s in settings_rows
        ]
    }

@app.patch("/api/settings")
def update_settings(
    req: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin")),
):
    updates = {}
    if req.risk_weight_identity is not None:
        updates["risk_weight_identity"] = str(req.risk_weight_identity)
    if req.risk_weight_anomaly is not None:
        updates["risk_weight_anomaly"] = str(req.risk_weight_anomaly)
    if req.risk_weight_criticality is not None:
        updates["risk_weight_criticality"] = str(req.risk_weight_criticality)
    if req.risk_weight_policy is not None:
        updates["risk_weight_policy"] = str(req.risk_weight_policy)

    # Validate weights sum to 1 if all provided
    w_keys = ["risk_weight_identity", "risk_weight_anomaly", "risk_weight_criticality", "risk_weight_policy"]
    if all(k in updates for k in w_keys):
        total = sum(float(updates[k]) for k in w_keys)
        if abs(total - 1.0) > 0.001:
            raise HTTPException(status_code=422, detail=f"Risk weights must sum to 1.0 (got {total:.4f})")

    for key, value in updates.items():
        row = db.query(ApplicationSetting).filter(ApplicationSetting.key == key).first()
        if row:
            row.value = value
        else:
            db.add(ApplicationSetting(key=key, value=value))

    if req.allow_threshold is not None:
        row = db.query(ApplicationSetting).filter(ApplicationSetting.key == "allow_threshold").first()
        if row:
            row.value = str(req.allow_threshold)
    if req.step_up_threshold is not None:
        row = db.query(ApplicationSetting).filter(ApplicationSetting.key == "step_up_threshold").first()
        if row:
            row.value = str(req.step_up_threshold)

    db.commit()
    write_audit(db, current_user.username, "settings_updated", "application_settings", updates)
    return {"message": "Settings updated"}

@app.post("/api/demo/reset")
def reset_demo(db: Session = Depends(get_db), current_user: User = Depends(require_permission("admin"))):
    seed_demo_data(db, reset=True)
    write_audit(db, current_user.username, "demo_reset", "database", {})
    return {"message": "Demo data reset successfully"}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SecureMesh API", "timestamp": datetime.utcnow().isoformat()}
