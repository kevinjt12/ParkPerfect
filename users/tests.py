"""
users/tests.py

Integration tests for the user Authentication and user Settings modules.

Run with:
    python manage.py test users
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import user, vehicle


# ── Helpers ───────────────────────────────────────────────────

def create_user(email='test@example.com', password='TestPass123!',
                first='John', last='Doe'):
    return user.objects.create_user(
        email=email, password=password, first_name=first, last_name=last
    )


def get_tokens(client, email, password):
    """Log in and return the access + refresh tokens."""
    response = client.post('/api/auth/login/', {
        'email': email,
        'password': password,
    }, format='json')
    return response.data.get('access'), response.data.get('refresh')


# ── user Login Flow ────────────────────────────────────

class user_login_tests(TestCase):
    """
    TC-04 — Valid credentials return JWT tokens.
             Invalid credentials return 401.
             Token blacklist works on logout.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = create_user()

    def test_login_valid_credentials_returns_tokens(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'test@example.com')

    def test_login_invalid_password_returns_401(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'WrongPassword!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)

    def test_login_unknown_email_returns_401(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'nobody@example.com',
            'password': 'TestPass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        access, refresh = get_tokens(self.client, 'test@example.com', 'TestPass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        # First logout should succeed
        response = self.client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Second logout with the same token should fail (already blacklisted)
        response = self.client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_without_token_returns_400(self):
        access, _ = get_tokens(self.client, 'test@example.com', 'TestPass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        response = self.client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post('/api/auth/register/', {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane@example.com',
            'password': 'NewPass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertTrue(user.objects.filter(email='jane@example.com').exists())


# ── Update user Settings ───────────────────────────────

class user_settings_tests(TestCase):
    """
    TC-05 — PATCH updates the correct DB record.
             verify_credentials() is called before password change.
             check_password() validates correctly.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = create_user()
        access, _ = get_tokens(self.client, 'test@example.com', 'TestPass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_change_name_updates_db(self):
        response = self.client.patch('/api/user/name/', {
            'first_name': 'Johnny',
            'last_name': 'Doe',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Johnny')

    def test_change_first_name_only(self):
        response = self.client.patch('/api/user/name/', {
            'first_name': 'Jonathan',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Jonathan')
        self.assertEqual(self.user.last_name, 'Doe')

    def test_change_email_updates_db(self):
        response = self.client.patch('/api/user/email/', {
            'email': 'newemail@example.com',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'newemail@example.com')

    def test_change_email_duplicate_returns_400(self):
        create_user(email='taken@example.com')
        response = self.client.patch('/api/user/email/', {
            'email': 'taken@example.com',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_with_correct_current_password(self):
        response = self.client.patch('/api/user/password/', {
            'current_password': 'TestPass123!',
            'new_password': 'NewSecure456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewSecure456!'))

    def test_change_password_wrong_current_password_returns_400(self):
        response = self.client.patch('/api/user/password/', {
            'current_password': 'WrongPassword!',
            'new_password': 'NewSecure456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('TestPass123!'))

    def test_change_password_too_short_returns_400(self):
        response = self.client.patch('/api/user/password/', {
            'current_password': 'TestPass123!',
            'new_password': 'short',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_plate_updates_db(self):
        vehicle.objects.create(
            user=self.user,
            license_plate_number='ABC123',
            license_plate_state='CT',
        )
        response = self.client.patch('/api/user/plate/', {
            'license_plate_number': 'XYZ789',
            'license_plate_state': 'NY',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vehicle_record = vehicle.objects.get(user=self.user)
        self.assertEqual(vehicle_record.license_plate_number, 'XYZ789')
        self.assertEqual(vehicle_record.license_plate_state, 'NY')

    def test_change_plate_no_vehicle_returns_404(self):
        response = self.client.patch('/api/user/plate/', {
            'license_plate_number': 'XYZ789',
            'license_plate_state': 'NY',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_settings_endpoints_require_authentication(self):
        unauthenticated = APIClient()
        for url in ['/api/user/name/', '/api/user/email/', '/api/user/password/', '/api/user/plate/']:
            response = unauthenticated.patch(url, {}, format='json')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED,
                             msg=f'{url} should require authentication')

