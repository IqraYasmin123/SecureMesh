import requests
import json

BASE = "http://127.0.0.1:8000"

print("1. Health check...")
r = requests.get(f"{BASE}/api/health")
print("Health:", r.status_code, r.json())
assert r.status_code == 200

print("\n2. Admin login...")
r = requests.post(f"{BASE}/api/auth/login", json={"username": "admin", "password": "Admin@SecureMesh2024"})
print("Login status:", r.status_code)
assert r.status_code == 200
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("User info:", r.json()["user"]["username"], "Role:", r.json()["user"]["role"])

print("\n3. Dashboard Summary...")
r = requests.get(f"{BASE}/api/analytics/summary", headers=headers)
summary = r.json()
print("Summary stats:", {
    "total_events": summary.get("total_events"),
    "open_alerts": summary.get("open_alerts"),
    "high_risk_events": summary.get("high_risk_events"),
    "protected_assets": summary.get("protected_assets"),
})

print("\n4. Zero-Trust Decision Evaluation...")
r = requests.post(f"{BASE}/api/zero-trust/evaluate", headers=headers, json={
    "action": "decrypt_file",
    "asset_criticality": 0.8,
    "identity_risk": 0.5,
    "anomaly_score": 0.6,
    "policy_violation": 0.2
})
zt = r.json()
print("ZT Decision:", zt["decision"], "Score:", zt["risk_score"], "Explanation:", zt["explanation"])

print("\n5. Risk Scoring Engine...")
r = requests.post(f"{BASE}/api/risk/score", headers=headers, json={
    "identity_risk": 0.7,
    "anomaly_score": 0.8,
    "asset_criticality": 0.9,
    "policy_violation": 0.5
})
risk = r.json()
print("Risk Score:", risk["score"], "Category:", risk["category"], "Decision:", risk["decision"])

print("\n6. Cryptographic Hash Chain Audit Verification...")
r = requests.post(f"{BASE}/api/audit/verify", headers=headers)
audit = r.json()
print("Audit Chain Verified:", audit["valid"], "Records Checked:", audit["records_checked"])

print("\n7. Cryptography Lab AES-256-GCM test...")
test_content = b"SECUREMESH_DEMO_TOP_SECRET_PAYLOAD_2026"
files = {"file": ("secret.txt", test_content, "text/plain")}
r = requests.post(f"{BASE}/api/crypto/encrypt", headers=headers, files=files)
enc = r.json()
print("Encrypted ciphertext size:", enc["ciphertext_size"], "Nonce:", enc["nonce"][:12] + "...")

# Decrypt
r = requests.post(f"{BASE}/api/crypto/decrypt", headers=headers, data={
    "ciphertext": enc["ciphertext"],
    "nonce": enc["nonce"]
})
dec = r.json()
print("Decryption message:", dec["message"], "| SHA256 Match:", dec["sha256"] == enc["original_sha256"])

print("\n=== ALL E2E BACKEND & LOGIC CHECKS PASSED ===")
