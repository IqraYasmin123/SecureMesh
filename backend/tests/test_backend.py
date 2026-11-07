"""
SecureMesh Backend Tests
Run: pytest tests/ -v
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_securemesh.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"

from main import app
from models import Base, get_db, init_db
from risk_engine import calculate_risk, RiskInput, DEFAULT_WEIGHTS, validate_weights
from crypto_ops import encrypt_file, decrypt_file, verify_integrity, sha256_hash
from audit import write_audit, verify_audit_chain

TEST_DB_URL = "sqlite:///./test_securemesh.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True, scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("test_securemesh.db"):
        try:
            os.remove("test_securemesh.db")
        except Exception:
            pass

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def admin_token(client):
    # Register admin
    client.post("/api/auth/register", json={
        "username": "testadmin",
        "email": "testadmin@test.local",
        "password": "TestAdmin@123",
        "role": "admin"
    })
    # Manually set role to admin in DB for test
    db = TestingSessionLocal()
    from models import User
    user = db.query(User).filter(User.username == "testadmin").first()
    if user:
        user.role = "admin"
        db.commit()
    db.close()

    resp = client.post("/api/auth/login", json={"username": "testadmin", "password": "TestAdmin@123"})
    assert resp.status_code == 200
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def viewer_token(client):
    client.post("/api/auth/register", json={
        "username": "testviewer",
        "email": "testviewer@test.local",
        "password": "TestViewer@123",
        "role": "viewer"
    })
    resp = client.post("/api/auth/login", json={"username": "testviewer", "password": "TestViewer@123"})
    assert resp.status_code == 200
    return resp.json()["access_token"]

# ─── Risk Engine Tests ────────────────────────────────────────────────────────

class TestRiskEngine:
    def test_minimum_risk(self):
        result = calculate_risk(RiskInput(0, 0, 0, 0))
        assert result.score == 0.0
        assert result.category == "minimal"
        assert result.decision == "ALLOW"

    def test_maximum_risk(self):
        result = calculate_risk(RiskInput(1, 1, 1, 1))
        assert result.score == 100.0
        assert result.category == "critical"
        assert result.decision == "DENY"

    def test_deterministic(self):
        r1 = calculate_risk(RiskInput(0.5, 0.6, 0.7, 0.3))
        r2 = calculate_risk(RiskInput(0.5, 0.6, 0.7, 0.3))
        assert r1.score == r2.score

    def test_weighted_formula(self):
        inp = RiskInput(1, 0, 0, 0)
        result = calculate_risk(inp, DEFAULT_WEIGHTS)
        expected = 100 * DEFAULT_WEIGHTS["identity_risk"]
        assert abs(result.score - expected) < 0.01

    def test_score_bounded(self):
        # Even with clamping, score stays 0-100
        result = calculate_risk(RiskInput(2.0, 2.0, 2.0, 2.0))
        assert 0 <= result.score <= 100

    def test_invalid_weights_sum(self):
        with pytest.raises(ValueError):
            validate_weights({"identity_risk": 0.5, "anomaly_score": 0.5, "asset_criticality": 0.5, "policy_violation": 0.5})

    def test_invalid_weight_range(self):
        with pytest.raises(ValueError):
            validate_weights({"identity_risk": -0.1, "anomaly_score": 0.35, "asset_criticality": 0.4, "policy_violation": 0.35})

    def test_medium_risk_step_up(self):
        result = calculate_risk(RiskInput(0.5, 0.5, 0.5, 0.5))
        assert result.score > 40
        assert result.decision in ("STEP_UP", "DENY")

    def test_factors_count(self):
        result = calculate_risk(RiskInput(0.3, 0.4, 0.5, 0.2))
        assert len(result.factors) == 4

    def test_factors_contributions_sum(self):
        result = calculate_risk(RiskInput(0.3, 0.4, 0.5, 0.2))
        total = sum(f["contribution"] for f in result.factors)
        assert abs(total - result.score) < 0.01

# ─── Crypto Tests ─────────────────────────────────────────────────────────────

class TestCrypto:
    TEST_KEY = b"A" * 32  # 256-bit test key

    def test_encrypt_decrypt_roundtrip(self):
        plaintext = b"Hello SecureMesh! This is a test file."
        enc = encrypt_file(plaintext, self.TEST_KEY)
        recovered = decrypt_file(enc["ciphertext"], enc["nonce"], self.TEST_KEY)
        assert recovered == plaintext

    def test_sha256_correct(self):
        data = b"test data"
        import hashlib
        expected = hashlib.sha256(data).hexdigest()
        assert sha256_hash(data) == expected

    def test_integrity_match(self):
        data = b"some file content"
        h = sha256_hash(data)
        result = verify_integrity(data, h)
        assert result["match"] is True

    def test_integrity_mismatch(self):
        data = b"some file content"
        result = verify_integrity(data, "wronghashvalue")
        assert result["match"] is False

    def test_tampered_ciphertext_fails(self):
        plaintext = b"Sensitive data that must not be tampered with."
        enc = encrypt_file(plaintext, self.TEST_KEY)
        import base64
        ct_bytes = base64.b64decode(enc["ciphertext"])
        # Flip a byte in the middle of ciphertext
        tampered = bytearray(ct_bytes)
        tampered[len(tampered) // 2] ^= 0xFF
        tampered_b64 = base64.b64encode(bytes(tampered)).decode()
        with pytest.raises((ValueError, Exception)):
            decrypt_file(tampered_b64, enc["nonce"], self.TEST_KEY)

    def test_nonce_uniqueness(self):
        data = b"same data"
        enc1 = encrypt_file(data, self.TEST_KEY)
        enc2 = encrypt_file(data, self.TEST_KEY)
        assert enc1["nonce"] != enc2["nonce"]

    def test_wrong_key_fails(self):
        data = b"secret"
        enc = encrypt_file(data, self.TEST_KEY)
        wrong_key = b"B" * 32
        with pytest.raises(ValueError):
            decrypt_file(enc["ciphertext"], enc["nonce"], wrong_key)

    def test_file_too_large(self):
        with pytest.raises(ValueError):
            encrypt_file(b"x" * (11 * 1024 * 1024), self.TEST_KEY)

# ─── Audit Chain Tests ────────────────────────────────────────────────────────

class TestAuditChain:
    def test_write_and_verify(self):
        db = TestingSessionLocal()
        write_audit(db, "testuser", "test_action", "obj1", {"key": "val"})
        result = verify_audit_chain(db)
        assert result["valid"] is True
        db.close()

    def test_multiple_records(self):
        db = TestingSessionLocal()
        for i in range(5):
            write_audit(db, "user", f"action_{i}", str(i), {})
        result = verify_audit_chain(db)
        assert result["valid"] is True
        db.close()

    def test_tampered_record_detected(self):
        from models import AuditRecord
        db = TestingSessionLocal()
        write_audit(db, "user", "sensitive_action", "asset", {"data": "original"})
        # Tamper with the latest record
        rec = db.query(AuditRecord).order_by(AuditRecord.id.desc()).first()
        rec.actor = "attacker"
        db.commit()
        result = verify_audit_chain(db)
        assert result["valid"] is False
        db.close()

# ─── API Tests ────────────────────────────────────────────────────────────────

class TestAuthAPI:
    def test_register(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "newuser123",
            "email": "newuser@test.local",
            "password": "Password@123",
            "role": "viewer"
        })
        assert resp.status_code == 200
        assert "user" in resp.json()

    def test_register_duplicate_username(self, client):
        client.post("/api/auth/register", json={
            "username": "dupuser",
            "email": "dup1@test.local",
            "password": "Password@123",
            "role": "viewer"
        })
        resp = client.post("/api/auth/register", json={
            "username": "dupuser",
            "email": "dup2@test.local",
            "password": "Password@123",
            "role": "viewer"
        })
        assert resp.status_code == 400

    def test_login_success(self, client):
        client.post("/api/auth/register", json={
            "username": "logintest",
            "email": "logintest@test.local",
            "password": "Password@123",
            "role": "viewer"
        })
        resp = client.post("/api/auth/login", json={"username": "logintest", "password": "Password@123"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        resp = client.post("/api/auth/login", json={"username": "logintest", "password": "WrongPassword!"})
        assert resp.status_code == 401

    def test_me_endpoint(self, client, admin_token):
        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert resp.json()["username"] == "testadmin"

    def test_unauthorized_access(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

class TestRBACAPI:
    def test_viewer_cannot_export(self, client, viewer_token):
        resp = client.get("/api/reports/export", headers={"Authorization": f"Bearer {viewer_token}"})
        assert resp.status_code == 403

    def test_viewer_cannot_reset_demo(self, client, viewer_token):
        resp = client.post("/api/demo/reset", headers={"Authorization": f"Bearer {viewer_token}"})
        assert resp.status_code == 403

    def test_admin_can_export(self, client, admin_token):
        resp = client.get("/api/reports/export?format=json&report_type=events",
                          headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200

class TestRiskAPI:
    def test_risk_score_valid(self, client, admin_token):
        resp = client.post("/api/risk/score", json={
            "identity_risk": 0.5,
            "anomaly_score": 0.4,
            "asset_criticality": 0.6,
            "policy_violation": 0.2
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert 0 <= data["score"] <= 100
        assert data["decision"] in ("ALLOW", "STEP_UP", "DENY")

    def test_risk_score_invalid_weights(self, client, admin_token):
        resp = client.post("/api/risk/score", json={
            "identity_risk": 0.5,
            "anomaly_score": 0.4,
            "asset_criticality": 0.6,
            "policy_violation": 0.2,
            "weights": {"identity_risk": 0.5, "anomaly_score": 0.5, "asset_criticality": 0.5, "policy_violation": 0.5}
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 422

class TestHealthAPI:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


def test_mpc_shamir_secret_sharing():
    from mpc_crypto import ShamirSecretSharing, MultiPartyComputationSim
    sss = ShamirSecretSharing()
    
    # (3, 5) Threshold Scheme
    secret_text = "HACKATHON_TOP_SECRET_SEED_2026"
    res = sss.split_string(secret_text, threshold_k=3, total_shares_n=5)
    
    assert len(res["shares"]) == 5
    assert res["threshold_k"] == 3
    
    # 3 shares can reconstruct
    subset_3 = res["shares"][:3]
    recovered = sss.reconstruct_from_hex_shares(subset_3)
    assert recovered == secret_text
    
    # Any other 3 shares can reconstruct
    subset_other_3 = [res["shares"][0], res["shares"][2], res["shares"][4]]
    recovered_other = sss.reconstruct_from_hex_shares(subset_other_3)
    assert recovered_other == secret_text
    
    # Multi-Party Threshold Signature simulation
    mpc = MultiPartyComputationSim(sss)
    sig_res = mpc.threshold_sign("TEST_AUDIT_TRANSACTION", subset_3, 3)
    assert sig_res["verified"] is True
    assert len(sig_res["partial_signatures"]) == 3


def test_autonomous_security_agent():
    from security_agent import mesh_agent
    
    # Telemetry with high severity should trigger autonomous encryption and secret sharing
    payload = {
        "severity": "CRITICAL",
        "anomaly_score": 0.92,
        "identity_risk": 0.84,
        "asset_id": "CORE_IDENTITY_VAULT",
        "data": "CONFIDENTIAL_ROOT_TOKEN"
    }
    decision = mesh_agent.evaluate_and_respond(payload)
    
    assert decision["autonomous_decision"]["action"] == "AUTONOMOUS_LOCKDOWN_AND_ENCRYPT"
    assert decision["cryptographic_action"]["data_sealed"] is True
    assert decision["cryptographic_action"]["encryption"]["algorithm"] == "AES-256-GCM"
    assert decision["cryptographic_action"]["mpc_secret_sharing"]["threshold_k"] == 3
    assert decision["verifiable_attestation"]["verified"] is True
    assert len(decision["verifiable_attestation"]["proof_hash"]) == 64
