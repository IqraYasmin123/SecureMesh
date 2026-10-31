"""
Risk Engine — Mathematical Risk Scoring (Module D)
Formula: R = 100 * (w_I*I + w_A*A + w_C*C + w_P*P)
"""
from dataclasses import dataclass
from typing import Optional

DEFAULT_WEIGHTS = {
    "identity_risk": 0.25,
    "anomaly_score": 0.35,
    "asset_criticality": 0.25,
    "policy_violation": 0.15,
}

RISK_CATEGORIES = [
    (0, 20, "minimal", "ALLOW", "Continue monitoring normally."),
    (20, 40, "low", "ALLOW", "Standard activity logging recommended."),
    (40, 60, "medium", "STEP_UP", "Require additional verification before proceeding."),
    (60, 80, "high", "STEP_UP", "Require strong MFA. Limit session scope."),
    (80, 101, "critical", "DENY", "Block action. Escalate to security team immediately."),
]

@dataclass
class RiskInput:
    identity_risk: float      # 0..1
    anomaly_score: float      # 0..1
    asset_criticality: float  # 0..1
    policy_violation: float   # 0..1

@dataclass
class RiskResult:
    score: float
    category: str
    decision: str
    explanation: str
    recommended_action: str
    factors: list
    weights: dict

def validate_weight(value: float, name: str) -> float:
    if not (0 <= value <= 1):
        raise ValueError(f"Weight '{name}' must be between 0 and 1, got {value}")
    return value

def validate_input(value: float, name: str) -> float:
    if not isinstance(value, (int, float)):
        raise ValueError(f"Input '{name}' must be numeric")
    clamped = max(0.0, min(1.0, float(value)))
    return clamped

def validate_weights(weights: dict) -> dict:
    required = {"identity_risk", "anomaly_score", "asset_criticality", "policy_violation"}
    if not required.issubset(weights.keys()):
        raise ValueError(f"Weights must include: {required}")
    for k in required:
        validate_weight(weights[k], k)
    total = sum(weights[k] for k in required)
    if abs(total - 1.0) > 0.001:
        raise ValueError(f"Weights must sum to 1.0, got {total:.4f}")
    return weights

def calculate_risk(
    risk_input: RiskInput,
    weights: Optional[dict] = None
) -> RiskResult:
    w = validate_weights(weights or DEFAULT_WEIGHTS)

    I = validate_input(risk_input.identity_risk, "identity_risk")
    A = validate_input(risk_input.anomaly_score, "anomaly_score")
    C = validate_input(risk_input.asset_criticality, "asset_criticality")
    P = validate_input(risk_input.policy_violation, "policy_violation")

    score = 100.0 * (
        w["identity_risk"] * I +
        w["anomaly_score"] * A +
        w["asset_criticality"] * C +
        w["policy_violation"] * P
    )
    score = round(max(0.0, min(100.0, score)), 2)

    category = "minimal"
    decision = "ALLOW"
    recommended_action = "Continue monitoring normally."
    for lo, hi, cat, dec, rec in RISK_CATEGORIES:
        if lo <= score < hi:
            category = cat
            decision = dec
            recommended_action = rec
            break

    factors = [
        {
            "name": "Identity Risk",
            "key": "identity_risk",
            "raw_value": I,
            "weight": w["identity_risk"],
            "contribution": round(100 * w["identity_risk"] * I, 2),
            "description": f"Identity/session risk at {I:.2f} — includes failed logins, suspicious location."
        },
        {
            "name": "Anomaly Score",
            "key": "anomaly_score",
            "raw_value": A,
            "weight": w["anomaly_score"],
            "contribution": round(100 * w["anomaly_score"] * A, 2),
            "description": f"Behavioral anomaly at {A:.2f} — deviation from baseline access patterns."
        },
        {
            "name": "Asset Criticality",
            "key": "asset_criticality",
            "raw_value": C,
            "weight": w["asset_criticality"],
            "contribution": round(100 * w["asset_criticality"] * C, 2),
            "description": f"Target asset criticality at {C:.2f} — sensitivity of the accessed resource."
        },
        {
            "name": "Policy Violation",
            "key": "policy_violation",
            "raw_value": P,
            "weight": w["policy_violation"],
            "contribution": round(100 * w["policy_violation"] * P, 2),
            "description": f"Policy violation severity at {P:.2f} — degree of zero-trust policy breach."
        },
    ]

    reasons = []
    if I > 0.6:
        reasons.append("High identity risk detected (suspicious login patterns or failed attempts).")
    if A > 0.6:
        reasons.append("Significant behavioral anomaly detected.")
    if C > 0.7:
        reasons.append("High-criticality asset targeted.")
    if P > 0.5:
        reasons.append("Significant policy violations present.")
    if not reasons:
        reasons.append("All risk factors within acceptable bounds.")

    explanation = f"Risk score {score:.1f} ({category.upper()}): " + " ".join(reasons)

    return RiskResult(
        score=score,
        category=category,
        decision=decision,
        explanation=explanation,
        recommended_action=recommended_action,
        factors=factors,
        weights=w,
    )
