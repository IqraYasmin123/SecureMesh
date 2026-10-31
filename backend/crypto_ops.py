"""
Cryptography operations — AES-256-GCM encryption/decryption, SHA-256 hashing. (Module E/F)
"""
import hashlib
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from config import get_settings

settings = get_settings()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def sha256_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def encrypt_file(data: bytes, key: bytes) -> dict:
    """Encrypt data with AES-256-GCM. Returns base64-encoded ciphertext, nonce, and tag info."""
    if len(data) > MAX_FILE_SIZE:
        raise ValueError("File too large. Maximum size is 10 MB.")
    if len(key) != 32:
        raise ValueError("Encryption key must be 32 bytes for AES-256.")

    nonce = os.urandom(12)  # 96-bit nonce for GCM
    aesgcm = AESGCM(key)
    ciphertext_with_tag = aesgcm.encrypt(nonce, data, None)

    original_hash = sha256_hash(data)

    return {
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext_with_tag).decode(),
        "original_sha256": original_hash,
        "algorithm": "AES-256-GCM",
        "nonce_size": len(nonce),
        "ciphertext_size": len(ciphertext_with_tag),
    }

def decrypt_file(ciphertext_b64: str, nonce_b64: str, key: bytes) -> bytes:
    """Decrypt AES-256-GCM ciphertext. Raises InvalidTag if authentication fails."""
    if len(key) != 32:
        raise ValueError("Encryption key must be 32 bytes for AES-256.")

    try:
        ciphertext = base64.b64decode(ciphertext_b64)
        nonce = base64.b64decode(nonce_b64)
    except Exception:
        raise ValueError("Invalid base64 encoding in ciphertext or nonce.")

    aesgcm = AESGCM(key)
    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext
    except Exception:
        raise ValueError("Decryption failed: authentication tag is invalid. Data may have been tampered with.")

def verify_integrity(data: bytes, expected_hash: str) -> dict:
    """Verify SHA-256 hash of data against an expected value."""
    actual_hash = sha256_hash(data)
    match = actual_hash.lower() == expected_hash.lower().strip()
    return {
        "match": match,
        "actual_hash": actual_hash,
        "expected_hash": expected_hash,
        "message": "Integrity verified: file matches expected hash." if match else "Integrity FAILED: file does not match expected hash — possible tampering.",
    }

def get_demo_key() -> bytes:
    """Returns the application encryption key for demo use. NOT production key management."""
    return settings.get_encryption_key_bytes()
