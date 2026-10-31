from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(256), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), nullable=False, default="viewer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    failed_logins = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

class SecurityEvent(Base):
    __tablename__ = "security_events"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False, default="medium")
    source_ip = Column(String(64), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(64), nullable=True)
    asset_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    is_synthetic = Column(Boolean, default=False)
    risk_score = Column(Float, nullable=True)

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_id = Column(Integer, ForeignKey("security_events.id"), nullable=True)
    user_id = Column(Integer, nullable=True)
    identity_risk = Column(Float, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    asset_criticality = Column(Float, nullable=False)
    policy_violation = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String(32), nullable=False)
    decision = Column(String(32), nullable=False)
    explanation = Column(Text, nullable=False)
    factors = Column(JSON, nullable=True)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    title = Column(String(256), nullable=False)
    severity = Column(String(16), nullable=False)
    event_id = Column(Integer, ForeignKey("security_events.id"), nullable=True)
    risk_score = Column(Float, nullable=True)
    detection_reason = Column(Text, nullable=False)
    recommended_response = Column(Text, nullable=False)
    status = Column(String(32), default="open")
    acknowledged_by = Column(String(64), nullable=True)
    resolved_by = Column(String(64), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

class FileRecord(Base):
    __tablename__ = "file_records"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    filename = Column(String(256), nullable=False)
    operation = Column(String(32), nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    file_size = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    success = Column(Boolean, default=True)
    details = Column(Text, nullable=True)

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    asset_type = Column(String(32), nullable=False)  # user, device, service, database, network
    criticality = Column(Float, default=0.5)
    description = Column(Text, nullable=True)
    properties = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)

class AssetEdge(Base):
    __tablename__ = "asset_edges"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    target_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    relationship = Column(String(64), nullable=False)
    weight = Column(Float, default=1.0)

class AuditRecord(Base):
    __tablename__ = "audit_records"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    actor = Column(String(128), nullable=False)
    action = Column(String(128), nullable=False)
    object_id = Column(String(128), nullable=True)
    details = Column(JSON, nullable=True)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    summary = Column(Text, nullable=True)
    severity = Column(String(16), nullable=False, default="medium")
    status = Column(String(32), nullable=False, default="open")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    assigned_to = Column(String(64), nullable=True)
    alert_ids = Column(JSON, nullable=True)
    risk_score = Column(Float, nullable=True)
    recommended_steps = Column(Text, nullable=True)

class IncidentNote(Base):
    __tablename__ = "incident_notes"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    author = Column(String(64), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ApplicationSetting(Base):
    __tablename__ = "application_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(128), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
