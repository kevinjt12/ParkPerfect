import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from parking.models import parking_lot

user = get_user_model()

@pytest.fixture(autouse=True)
def use_test_urls(settings):
    settings.ROOT_URLCONF = 'parking.urls'

@pytest.fixture
def user(db):
    return user.objects.create_user(
        email="test@test.com",
        password="testpass123"
    )

@pytest.fixture
def lot(db):
    return parking_lot.objects.create(
        name="Test Lot",
        total_spaces=10,
        available_spaces=5,
        latitude=40.7128,
        longitude=-74.0060
    )

@pytest.fixture
def auth_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client

