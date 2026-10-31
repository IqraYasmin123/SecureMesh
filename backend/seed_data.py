"""
Demo data seeder — creates labeled synthetic events, assets, graph, and users.
"""
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from models import (
    User, SecurityEvent, Alert, Asset, AssetEdge,
    ApplicationSetting, Incident, IncidentNote, RiskAssessment
)
from auth_utils import hash_password
from audit import write_audit
from config import get_settings
from risk_engine import calculate_risk, RiskInput, DEFAULT_WEIGHTS

settings = get_settings()

DEMO_USERS = [
    {"username": "admin", "email": "admin@securemesh.local", "role": "admin", "password_key": "DEMO_ADMIN_PASSWORD"},
    {"username": "analyst", "email": "analyst@securemesh.local", "role": "analyst", "password_key": "DEMO_ANALYST_PASSWORD"},
    {"username": "viewer", "email": "viewer@securemesh.local", "role": "viewer", "password_key": "DEMO_VIEWER_PASSWORD"},
]

DEMO_ASSETS = [
    {"name": "Auth Server", "asset_type": "service", "criticality": 0.95, "description": "Primary authentication service"},
    {"name": "Database Cluster", "asset_type": "database", "criticality": 0.90, "description": "Main production database"},
    {"name": "API Gateway", "asset_type": "service", "criticality": 0.85, "description": "External API gateway"},
    {"name": "Admin Workstation", "asset_type": "device", "criticality": 0.80, "description": "Administrator workstation"},
    {"name": "Analyst Workstation", "asset_type": "device", "criticality": 0.60, "description": "Security analyst workstation"},
    {"name": "Web Server", "asset_type": "service", "criticality": 0.75, "description": "Public web server"},
    {"name": "Backup Storage", "asset_type": "service", "criticality": 0.70, "description": "Encrypted backup storage"},
    {"name": "Internal Network", "asset_type": "network", "criticality": 0.65, "description": "Internal corporate network"},
    {"name": "Admin User", "asset_type": "user", "criticality": 0.85, "description": "Administrator account"},
    {"name": "Analyst User", "asset_type": "user", "criticality": 0.60, "description": "Security analyst account"},
    {"name": "Firewall", "asset_type": "network", "criticality": 0.80, "description": "Perimeter firewall"},
    {"name": "SIEM System", "asset_type": "service", "criticality": 0.75, "description": "Security information and event management"},
]

DEMO_EDGES = [
    (0, 1, "authenticates_to", 1.0),
    (0, 2, "protects", 0.9),
    (2, 1, "routes_to", 0.8),
    (3, 0, "connects_to", 0.7),
    (4, 0, "connects_to", 0.7),
    (5, 2, "routes_through", 0.8),
    (5, 1, "reads_from", 0.6),
    (1, 6, "backed_up_to", 0.5),
    (3, 7, "on_network", 0.6),
    (4, 7, "on_network", 0.6),
    (8, 3, "uses", 0.9),
    (9, 4, "uses", 0.7),
    (10, 7, "secures", 0.9),
    (11, 0, "monitors", 0.8),
    (11, 1, "monitors", 0.8),
]

DEMO_EVENTS_TEMPLATES = [
    {"event_type": "login_success", "severity": "low", "description": "Successful login from known IP", "username": "analyst", "source_ip": "10.0.1.15"},
    {"event_type": "login_failure", "severity": "medium", "description": "Failed login attempt — invalid credentials", "username": "admin", "source_ip": "192.168.1.100"},
    {"event_type": "login_failure", "severity": "medium", "description": "Failed login attempt — account not found", "username": "unknown_user", "source_ip": "203.0.113.45"},
    {"event_type": "login_failure", "severity": "high", "description": "Failed login attempt — possible brute-force", "username": "admin", "source_ip": "203.0.113.45"},
    {"event_type": "sensitive_asset_access", "severity": "high", "description": "Access to database cluster from analyst workstation", "username": "analyst", "source_ip": "10.0.1.15"},
    {"event_type": "policy_deny", "severity": "high", "description": "Zero-trust policy denied access — insufficient privileges", "username": "viewer", "source_ip": "10.0.1.20"},
    {"event_type": "policy_step_up", "severity": "medium", "description": "Step-up verification required for sensitive asset access", "username": "analyst", "source_ip": "10.0.1.15"},
    {"event_type": "anomalous_access", "severity": "high", "description": "[SYNTHETIC] Anomalous access pattern detected — off-hours login", "username": "analyst", "source_ip": "198.51.100.77"},
    {"event_type": "unusual_time_access", "severity": "medium", "description": "[SYNTHETIC] Access outside normal working hours", "username": "viewer", "source_ip": "10.0.1.20"},
    {"event_type": "file_encrypted", "severity": "low", "description": "File encrypted using AES-256-GCM", "username": "admin", "source_ip": "10.0.0.1"},
    {"event_type": "integrity_failure", "severity": "critical", "description": "[SYNTHETIC] File integrity verification failed — possible tampering detected", "username": "system", "source_ip": "10.0.0.5"},
    {"event_type": "config_change", "severity": "medium", "description": "Security policy configuration updated", "username": "admin", "source_ip": "10.0.0.1"},
]

RISK_PROFILES = [
    RiskInput(0.1, 0.1, 0.3, 0.0),
    RiskInput(0.4, 0.3, 0.5, 0.1),
    RiskInput(0.2, 0.5, 0.4, 0.2),
    RiskInput(0.6, 0.7, 0.8, 0.5),
    RiskInput(0.8, 0.9, 0.9, 0.7),
    RiskInput(0.3, 0.4, 0.6, 0.3),
    RiskInput(0.5, 0.6, 0.7, 0.4),
    RiskInput(0.9, 0.85, 0.9, 0.8),
    RiskInput(0.5, 0.5, 0.5, 0.3),
    RiskInput(0.2, 0.2, 0.4, 0.1),
    RiskInput(0.95, 0.9, 0.95, 0.9),
    RiskInput(0.3, 0.3, 0.5, 0.2),
]

def seed_demo_data(db: Session, reset: bool = False):
    """Seed the database with demo data. If reset=True, clear existing data first."""
    if reset:
        # Clear synthetic data
        db.query(RiskAssessment).delete()
        db.query(Alert).delete()
        db.query(SecurityEvent).filter(SecurityEvent.is_synthetic == True).delete()
        db.query(IncidentNote).delete()
        db.query(Incident).delete()
        db.query(AssetEdge).delete()
        db.query(Asset).delete()
        db.query(ApplicationSetting).delete()
        db.commit()

    # Create demo users
    for u in DEMO_USERS:
        if not db.query(User).filter(User.username == u["username"]).first():
            password = getattr(settings, u["password_key"])
            user = User(
                username=u["username"],
                email=u["email"],
                role=u["role"],
                hashed_password=hash_password(password),
            )
            db.add(user)
    db.commit()

    # Create assets
    asset_ids = []
    if db.query(Asset).count() == 0:
        for a in DEMO_ASSETS:
            asset = Asset(**{k: v for k, v in a.items()})
            db.add(asset)
        db.commit()
        assets = db.query(Asset).all()
        asset_ids = [a.id for a in assets]

        for src_idx, tgt_idx, rel, weight in DEMO_EDGES:
            if src_idx < len(asset_ids) and tgt_idx < len(asset_ids):
                edge = AssetEdge(
                    source_id=asset_ids[src_idx],
                    target_id=asset_ids[tgt_idx],
                    relationship=rel,
                    weight=weight,
                )
                db.add(edge)
        db.commit()

    # Create synthetic events with risk assessments
    if db.query(SecurityEvent).filter(SecurityEvent.is_synthetic == True).count() == 0:
        now = datetime.utcnow()
        for i, (tmpl, risk_input) in enumerate(zip(DEMO_EVENTS_TEMPLATES, RISK_PROFILES)):
            ts = now - timedelta(hours=random.randint(1, 72), minutes=random.randint(0, 59))
            risk_result = calculate_risk(risk_input, DEFAULT_WEIGHTS)

            event = SecurityEvent(
                timestamp=ts,
                event_type=tmpl["event_type"],
                severity=tmpl["severity"],
                source_ip=tmpl.get("source_ip"),
                username=tmpl.get("username"),
                description=tmpl["description"],
                details={"rule": "demo", "index": i},
                is_synthetic=True,
                risk_score=risk_result.score,
            )
            db.add(event)
            db.commit()
            db.refresh(event)

            assessment = RiskAssessment(
                event_id=event.id,
                identity_risk=risk_input.identity_risk,
                anomaly_score=risk_input.anomaly_score,
                asset_criticality=risk_input.asset_criticality,
                policy_violation=risk_input.policy_violation,
                risk_score=risk_result.score,
                risk_category=risk_result.category,
                decision=risk_result.decision,
                explanation=risk_result.explanation,
                factors=risk_result.factors,
            )
            db.add(assessment)
        db.commit()

        # Create alerts for high-severity events
        events = db.query(SecurityEvent).filter(SecurityEvent.is_synthetic == True).all()
        for ev in events:
            if ev.severity in ("high", "critical"):
                alert = Alert(
                    timestamp=ev.timestamp,
                    title=f"Alert: {ev.event_type.replace('_', ' ').title()}",
                    severity=ev.severity,
                    event_id=ev.id,
                    risk_score=ev.risk_score,
                    detection_reason=f"[RULE_AUTO] {ev.description}",
                    recommended_response="Investigate the associated event. Review user activity and source IP.",
                    status="open",
                )
                db.add(alert)
        db.commit()

        # Create a sample incident
        if db.query(Incident).count() == 0:
            incident = Incident(
                title="[SYNTHETIC] Potential Brute-Force + Lateral Movement",
                summary="Multiple failed login attempts followed by anomalous database access from an external IP. Possible credential stuffing leading to lateral movement.",
                severity="critical",
                status="investigating",
                assigned_to="analyst",
                risk_score=87.5,
                recommended_steps="1. Isolate the source IP at the firewall.\n2. Force password reset for targeted accounts.\n3. Review all database access logs from the past 24 hours.\n4. Notify the security operations center.",
            )
            db.add(incident)
            db.commit()
            db.refresh(incident)

            note = IncidentNote(
                incident_id=incident.id,
                author="analyst",
                content="[SYNTHETIC] Initial triage complete. Source IP 203.0.113.45 identified as external. Correlates with 3 failed login attempts followed by successful login from a different IP. Possible credential handoff or VPN exit node.",
                created_at=datetime.utcnow() - timedelta(hours=1),
            )
            db.add(note)
            db.commit()

    # Default settings
    default_settings = [
        ("risk_weight_identity", "0.25", "Weight for identity/session risk in risk formula"),
        ("risk_weight_anomaly", "0.35", "Weight for anomaly score in risk formula"),
        ("risk_weight_criticality", "0.25", "Weight for asset criticality in risk formula"),
        ("risk_weight_policy", "0.15", "Weight for policy violation severity in risk formula"),
        ("allow_threshold", "40.0", "Risk score below which requests are allowed"),
        ("step_up_threshold", "70.0", "Risk score below which step-up verification is required (above = DENY)"),
        ("max_failed_logins", "5", "Maximum failed logins before temporary account lockout"),
        ("lockout_minutes", "30", "Minutes to lock account after exceeding failed login threshold"),
    ]
    for key, value, desc in default_settings:
        if not db.query(ApplicationSetting).filter(ApplicationSetting.key == key).first():
            setting = ApplicationSetting(key=key, value=value, description=desc)
            db.add(setting)
    db.commit()

    # Write audit entry for seeding
    try:
        write_audit(db, "system", "demo_data_seeded", "database", {"action": "seed", "reset": reset})
    except Exception:
        pass
