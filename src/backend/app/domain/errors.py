class DomainError(Exception):
    code = "domain_error"

    def __init__(self, message: str, *, current: object | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.current = current


class ValidationError(DomainError):
    code = "validation"


class NotFoundError(DomainError):
    code = "not_found"


class ConflictError(DomainError):
    code = "conflict"


class AuthenticationError(DomainError):
    code = "authentication"


class PermissionError(DomainError):
    code = "permission"


class EmailTakenError(DomainError):
    code = "email_taken"


class MailDeliveryError(DomainError):
    code = "mail"
