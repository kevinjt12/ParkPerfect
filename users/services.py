"""
users/services.py

Service-layer helpers for the user Authentication and user Settings modules.
Referenced in DDD plan sections 2.4 and 4.1.
"""


def verify_credentials(user, password: str) -> bool:
    """
    Verifies that the supplied plain-text password matches the user's stored
    hashed password. Uses Django's built-in check_password() method.

    Called by:
      - change_password_view  (before allowing a password update)
      - change_email_view     (optional — can be added for extra security)

    Returns True if the password is correct, False otherwise.
    """
    return user.check_password(password)

