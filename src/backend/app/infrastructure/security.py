import secrets

from pwdlib import PasswordHash


class Argon2PasswordHasher:
    def __init__(self) -> None:
        self._hasher = PasswordHash.recommended()
        self._dummy = self._hasher.hash("not-a-real-password")

    def hash(self, password: str) -> str:
        return self._hasher.hash(password)

    def verify(self, password: str, password_hash: str | None) -> bool:
        stored = self._dummy if password_hash is None else password_hash
        try:
            matched = self._hasher.verify(password, stored)
        except Exception:
            return False
        return matched and password_hash is not None


class SecretTokenFactory:
    def session_token(self) -> str:
        return secrets.token_urlsafe(32)

    def reset_token(self) -> str:
        return secrets.token_urlsafe(32)

    def invite_code(self) -> str:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return "".join(secrets.choice(alphabet) for _ in range(8))
