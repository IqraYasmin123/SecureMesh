"""
Zero-Trust Policy Decision Engine (Module C)
Evaluates available signals and returns ALLOW / STEP_UP / DENY.
"""
from typing import Optional
from risk_engine import calculate_risk, RiskInput

POLICY_THRESHOLDS = {
    "allow_max": 40.0,
    "step_up_max": 70.0,
    # Above step_up_max => DENY
}

SENSITIVE_ACTIONS = {
    "delete_asset", "export_data", "modify_settings", "view_audit",
    "reset_demo", "manage_users", "decrypt_file"
}

def evaluate_zero_trust(
    action: str,
    user_role: str,
    asset_criticality: float = 0.5,
    identity_risk: float = 0.0,
    anomaly_score: float = 0.0,
    policy_violation: float = 0.0,
    weights: Optional[dict] = None,
) -> dict:
    """
    Evaluate whether to ALLOW, STEP_UP, or DENY the given action.
    Returns decision, risk_score, explanation, and factor breakdown.
    """
    # Compute risk
    risk_input = RiskInput(
        identity_risk=identity_risk,
        anomaly_score=anomaly_score,
        asset_criticality=asset_criticality,
        policy_violation=policy_violation,
    )
    result = calculate_risk(risk_input, weights)

    # Override: sensitive actions raise bar
    is_sensitive = action in SENSITIVE_ACTIONS
    effective_allow_max = POLICY_THRESHOLDS["allow_max"] * (0.75 if is_sensitive else 1.0)
    effective_step_max = POLICY_THRESHOLDS["step_up_max"] * (0.75 if is_sensitive else 1.0)

    # Role-based restrictions
    restricted_for_role = False
    role_note = ""
    if user_role == "viewer" and action in {"delete_asset", "modify_settings", "manage_users", "reset_demo"}:
        restricted_for_role = True
        role_note = f"Role 'viewer' is not permitted to perform '{action}'."

    if restricted_for_role:
        decision = "DENY"
        explanation = f"DENY: {role_note} " + result.explanation
    elif result.score <= effective_allow_max:
        decision = "ALLOW"
        explanation = f"ALLOW: Risk score {result.score:.1f} is within acceptable limits for '{action}'."
    elif result.score <= effective_step_max:
        decision = "STEP_UP"
        explanation = f"STEP_UP: Risk score {result.score:.1f} requires additional verification before '{action}'. " + result.explanation
    else:
        decision = "DENY"
        explanation = f"DENY: Risk score {result.score:.1f} exceeds threshold for '{action}'. " + result.explanation

    return {
        "decision": decision,
        "risk_score": result.score,
        "risk_category": result.category,
        "explanation": explanation,
        "recommended_action": result.recommended_action,
        "factors": result.factors,
        "weights": result.weights,
        "action": action,
        "is_sensitive_action": is_sensitive,
        "role_restriction": role_note or None,
    }
