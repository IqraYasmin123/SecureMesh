"""
Threat detection — rule-based alert generation (Module G)
"""
from datetime import timedelta
from sqlalchemy.orm import Session
from models import SecurityEvent, Alert

DETECTION_RULES = [
    {
        "id": "RULE_001",
        "name": "Repeated Failed Logins",
        "event_types": ["login_failure"],
        "threshold": 3,
        "window_minutes": 15,
        "severity": "high",
        "reason": "Multiple failed login attempts detected within a short window — possible brute-force attack.",
        "response": "Lock the account temporarily. Investigate source IP. Require MFA on next successful login.",
    },
    {
        "id": "RULE_002",
        "name": "High-Risk Policy Decision",
        "event_types": ["policy_deny", "policy_step_up"],
        "threshold": 2,
        "window_minutes": 30,
        "severity": "high",
        "reason": "Multiple high-risk policy decisions detected — potential privilege escalation or unauthorized access attempt.",
        "response": "Review the associated user session. Revoke session if anomalous.",
    },
    {
        "id": "RULE_003",
        "name": "Sensitive Asset Access",
        "event_types": ["sensitive_asset_access"],
        "threshold": 1,
        "window_minutes": 60,
        "severity": "medium",
        "reason": "Access to high-criticality asset detected.",
        "response": "Verify that the access was authorized. Review asset access logs.",
    },
    {
        "id": "RULE_004",
        "name": "File Integrity Failure",
        "event_types": ["integrity_failure"],
        "threshold": 1,
        "window_minutes": 1440,
        "severity": "critical",
        "reason": "File integrity verification failed — possible tampering or corruption.",
        "response": "Quarantine the file. Restore from backup. Escalate to security team.",
    },
    {
        "id": "RULE_005",
        "name": "Anomalous Activity Pattern",
        "event_types": ["anomalous_access", "unusual_time_access"],
        "threshold": 1,
        "window_minutes": 60,
        "severity": "medium",
        "reason": "Anomalous access pattern detected — activity deviates significantly from baseline.",
        "response": "Investigate activity context. Consider step-up authentication.",
    },
]

def run_detection(db: Session, event: SecurityEvent) -> list[Alert]:
    """Evaluate a new event against all detection rules. Create alerts as needed."""
    created_alerts = []
    window_start = event.timestamp - timedelta(minutes=60)

    for rule in DETECTION_RULES:
        if event.event_type not in rule["event_types"]:
            continue

        count = db.query(SecurityEvent).filter(
            SecurityEvent.event_type.in_(rule["event_types"]),
            SecurityEvent.timestamp >= window_start,
            SecurityEvent.username == event.username if event.username else True,
        ).count()

        if count >= rule["threshold"]:
            # Check for duplicate alert in last hour
            existing = db.query(Alert).filter(
                Alert.event_id == event.id,
                Alert.detection_reason.contains(rule["id"]),
            ).first()
            if existing:
                continue

            alert = Alert(
                title=rule["name"],
                severity=rule["severity"],
                event_id=event.id,
                risk_score=event.risk_score or 50.0,
                detection_reason=f"[{rule['id']}] {rule['reason']}",
                recommended_response=rule["response"],
                status="open",
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            created_alerts.append(alert)

    return created_alerts
