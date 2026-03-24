"""
users/services.py

Service-layer helpers for the User Authentication and User Settings modules.
Referenced in DDD plan sections 2.4 and 4.1.
"""


def verify_credentials(user, password: str) -> bool:
    """
    Verifies that the supplied plain-text password matches the user's stored
    hashed password. Uses Django's built-in check_password() method.

    Called by:
      - ChangePasswordView  (before allowing a password update)
      - ChangeEmailView     (optional — can be added for extra security)

    Returns True if the password is correct, False otherwise.
    """
    return user.check_password(password)