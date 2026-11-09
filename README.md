# 🛡️ SecureMesh: Zero-Trust Cybersecurity Platform

> **NIST SP 800-207 Zero-Trust Architecture** empowered by **Finite-Field Multi-Party Computation (MPC)** & **Autonomous Verifiable Secure AI Agents**.  
> Developed for the **Mathematics for Systems Security Hackathon (Devpost)** — Full Dual-Track Winner Scope.

---

## 🌐 Live Production Deployments
- **Live Web Application:** [https://secure-mesh-two.vercel.app](https://secure-mesh-two.vercel.app)
- **Live Cloud Backend API:** [https://iqra30205-securemesh-backend.hf.space](https://iqra30205-securemesh-backend.hf.space)
- **GitHub Repository:** [https://github.com/IqraYasmin123/SecureMesh.git](https://github.com/IqraYasmin123/SecureMesh.git)

---

## 🎯 Track 1: Advanced Cryptography (MPC & Secret Sharing)
- **Finite-Field Arithmetic:** Implemented over a 256-bit prime field $\mathbb{F}_p$ ($p = 2^{256} - 189$) with Extended Euclidean modular inverse.
- **$(k, n)$ Threshold Shamir's Secret Sharing:** Evaluated using Horner's method to distribute encryption keys across validator nodes.
- **Lagrange Polynomial Interpolation:** Reconstructs the exact master secret $f(0)$ using any $k$ shares without exposing polynomial coefficients.
- **Feldman Verifiable Secret Sharing (VSS):** Discrete-log commitments $C_j = g^{a_j} \pmod p$ allow nodes to detect corrupt or malicious shares prior to reconstruction.
- **Collaborative Threshold Signing:** Distributed nodes contribute partial signatures $s_i = w_i \cdot m \cdot \ell_i(0) \pmod p$ to validate actions without assembling the private key in a single memory space.

---

## 🤖 Track 2: Secure Autonomous AI Agent (MeshGuard-01)
- **Dynamic Threat Ingestion:** Real-time analysis of Anomaly Score ($A$), Identity Risk ($I$), Severity ($S$), and Asset Criticality.
- **Mathematical Trust Formulation:** Calculates composite trust score:
  $$T = 100 - (0.4A + 0.4I + 0.2S)$$
- **Autonomous Incident Remediation:** If $T < 40$ or severity $\ge$ HIGH, automatically initiates `AUTONOMOUS_LOCKDOWN_AND_ENCRYPT`.
- **Cryptographic Data Sealing:** Ephemeral 256-bit AES-256-GCM symmetric encryption of sensitive target data.
- **Key Partitioning:** Immediately splits the symmetric key into $(3, 5)$ Shamir shares across distributed validator nodes.
- **Tamper-Evident Attestation Proof:** Generates a SHA-256 cryptographic proof binding Agent ID, timestamp, input digest, and state transition.

---

## 🔐 Credentials for Live Evaluation
| Role | Username | Password |
|---|---|---|
| **Administrator** | `admin` | `Admin@SecureMesh2024` |
| **Security Analyst** | `analyst` | `Analyst@SecureMesh2024` |
| **Auditor** | `auditor` | `Auditor@SecureMesh2024` |

---

## 🚀 Local Quickstart & Verification
```bash
# Run 35 automated pytest tests
python -m pytest backend/tests/test_backend.py -v

# Run End-to-End E2E platform test
python verify_e2e.py
```
