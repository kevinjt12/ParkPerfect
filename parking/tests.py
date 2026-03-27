from django.test import TestCase
from django.contrib.auth import get_user_model
from parking.models import ParkingLot, ParkingEvent
from parking.services import mark_parked, mark_left
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import threading

User = get_user_model()
# commented out tests as they give issues with connecting to other pieces of the codebase at the moment.


# TC-01: Parking a Vehicle
@pytest.mark.django_db
def test_park_returns_200(auth_client, lot):
    response = auth_client.post("/parking/park/", {"lot_id": lot.lotID})
    assert response.status_code == 200

@pytest.mark.django_db
def test_mark_parked_decrements_spaces(user, lot):
    mark_parked(user.userID, lot.lotID)
    lot.refresh_from_db()
    assert lot.availableSpaces == 4

@pytest.mark.django_db
def test_mark_parked_creates_event(user, lot):
    mark_parked(user.userID, lot.lotID)
    event = ParkingEvent.objects.get(user_id=user.userID, lot=lot)
    assert event.eventType == ParkingEvent.PARKED

@pytest.mark.django_db
def test_mark_parked_fails_when_lot_full(user, lot):
    lot.availableSpaces = 0
    lot.save()
    with pytest.raises(ValueError):
        mark_parked(user.userID, lot.lotID)

@pytest.mark.django_db
def test_mark_parked_no_event_created_when_lot_full(user, lot):
    lot.availableSpaces = 0
    lot.save()
    with pytest.raises(ValueError):
        mark_parked(user.userID, lot.lotID)
    assert ParkingEvent.objects.filter(user_id=user.userID).count() == 0

# TC-02: Leaving a Parking Space
@pytest.mark.django_db
def test_leave_returns_200(auth_client, lot):
    response = auth_client.post("/parking/leave/", {"lot_id": lot.lotID})
    assert response.status_code == 200

@pytest.mark.django_db
def test_mark_left_increments_spaces(user, lot):
    mark_left(user.userID, lot.lotID)
    lot.refresh_from_db()
    assert lot.availableSpaces == 6

@pytest.mark.django_db
def test_mark_left_creates_event(user, lot):
    mark_left(user.userID, lot.lotID)
    event = ParkingEvent.objects.get(user_id=user.userID, lot=lot)
    assert event.eventType == ParkingEvent.LEFT

@pytest.mark.django_db
def test_mark_left_fails_when_already_full(user, lot):
    lot.availableSpaces = lot.totalSpaces
    lot.save()
    with pytest.raises(ValueError):
        mark_left(user.userID, lot.lotID)

@pytest.mark.django_db
def test_mark_left_no_event_created_when_already_full(user, lot):
    lot.availableSpaces = lot.totalSpaces
    lot.save()
    with pytest.raises(ValueError):
        mark_left(user.userID, lot.lotID)
    assert ParkingEvent.objects.filter(user_id=user.userID).count() == 0

# TC-03: Concurrent Parking Events
def test_concurrent_parking_no_negative_spaces(db):
    lot = ParkingLot.objects.create(
        name="Test Lot",
        totalSpaces=10,
        availableSpaces=2,  # >=2 so both can succeed per TC-03
        latitude=40.7128,
        longitude=-74.0060
    )
    lot_id = lot.lotID

    users = [
        User.objects.create_user(email=f"user{i}@test.com", password="pass")
        for i in range(2)
    ]
    user_ids = [u.userID for u in users]

    errors = []
    def attempt_park(uid):
        try:
            mark_parked(uid, lot_id)
        except ValueError:
            errors.append("full")

    threads = [threading.Thread(target=attempt_park, args=(uid,)) for uid in user_ids]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    lot.refresh_from_db()
    assert lot.availableSpaces == 0   # both succeeded, decremented by 2
    assert len(errors) == 0           # neither was rejected
    assert lot.availableSpaces >= 0   # never went negative

# Parking Lot View Tests

@pytest.mark.django_db
def test_park_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/park/", {"lot_id": lot.lotID})
    assert response.status_code == 401

@pytest.mark.django_db
def test_park_missing_lot_id_returns_400(auth_client):
    response = auth_client.post("/parking/park/", {})
    assert response.status_code == 400

@pytest.mark.django_db
def test_park_full_lot_returns_400(auth_client, lot):
    lot.availableSpaces = 0
    lot.save()
    response = auth_client.post("/parking/park/", {"lot_id": lot.lotID})
    assert response.status_code == 400

@pytest.mark.django_db
def test_leave_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/leave/", {"lot_id": lot.lotID})
    assert response.status_code == 401

@pytest.mark.django_db
def test_leave_full_lot_returns_400(auth_client, lot):
    lot.availableSpaces = lot.totalSpaces
    lot.save()
    response = auth_client.post("/parking/leave/", {"lot_id": lot.lotID})
    assert response.status_code == 400

# ParkActionView Module Tests
@pytest.mark.django_db
def test_view_parking_map_returns_200(auth_client, lot):
    response = auth_client.get("/parking/map/")
    assert response.status_code == 200

@pytest.mark.django_db
def test_view_parking_map_returns_lot_data(auth_client, lot):
    response = auth_client.get("/parking/map/")
    assert len(response.data) > 0

@pytest.mark.django_db
def test_view_parking_map_requires_authentication(lot):
    client = APIClient()
    response = client.get("/parking/map/")
    assert response.status_code == 401

@pytest.mark.django_db
def test_request_park_returns_200(auth_client, lot):
    response = auth_client.post("/parking/action/park/", {"lot_id": lot.lotID})
    assert response.status_code == 200

@pytest.mark.django_db
def test_request_park_fails_when_lot_not_found(auth_client):
    response = auth_client.post("/parking/action/park/", {"lot_id": 99999})
    assert response.status_code == 404

@pytest.mark.django_db
def test_request_park_fails_when_lot_full(auth_client, lot):
    lot.availableSpaces = 0
    lot.save()
    response = auth_client.post("/parking/action/park/", {"lot_id": lot.lotID})
    assert response.status_code == 400

@pytest.mark.django_db
def test_request_park_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/action/park/", {"lot_id": lot.lotID})
    assert response.status_code == 401

@pytest.mark.django_db
def test_request_park_missing_lot_id_returns_400(auth_client):
    response = auth_client.post("/parking/action/park/", {})
    assert response.status_code == 400

@pytest.mark.django_db
def test_request_leave_returns_200(auth_client, lot, user):
    # user must have an active parked record first
    ParkingEvent.objects.create(
        user=user,
        lot=lot,
        eventType=ParkingEvent.PARKED
    )
    response = auth_client.post("/parking/action/leave/", {"lot_id": lot.lotID})
    assert response.status_code == 200

@pytest.mark.django_db
def test_request_leave_fails_without_active_record(auth_client, lot):
    # no ParkingEvent created — should be rejected
    response = auth_client.post("/parking/action/leave/", {"lot_id": lot.lotID})
    assert response.status_code == 400

@pytest.mark.django_db
def test_request_leave_fails_when_lot_not_found(auth_client):
    response = auth_client.post("/parking/action/leave/", {"lot_id": 99999})
    assert response.status_code == 404

@pytest.mark.django_db
def test_request_leave_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/action/leave/", {"lot_id": lot.lotID})
    assert response.status_code == 401

@pytest.mark.django_db
def test_request_leave_missing_lot_id_returns_400(auth_client):
    response = auth_client.post("/parking/action/leave/", {})
    assert response.status_code == 400