from django.test import TestCase
from django.contrib.auth import get_user_model
from parking.models import parking_lot, parking_event
from parking.services import mark_parked, mark_left
import unittest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import threading

try:
    import pytest
except ModuleNotFoundError:
    class _PytestShim:
        class mark:
            @staticmethod
            def django_db(func):
                return func

        @staticmethod
        def raises(exception_type):
            return unittest.TestCase().assertRaises(exception_type)

    pytest = _PytestShim()

user = get_user_model()
# commented out tests as they give issues with connecting to other pieces of the codebase at the moment.


# TC-01: Parking a vehicle
@pytest.mark.django_db
def test_park_returns_200(auth_client, lot):
    response = auth_client.post("/parking/park/", {"lot_id": lot.lot_id})
    assert response.status_code == 200

@pytest.mark.django_db
def test_mark_parked_decrements_spaces(user, lot):
    mark_parked(user.user_id, lot.lot_id)
    lot.refresh_from_db()
    assert lot.available_spaces == 4

@pytest.mark.django_db
def test_mark_parked_creates_event(user, lot):
    mark_parked(user.user_id, lot.lot_id)
    event = parking_event.objects.get(user_id=user.user_id, lot=lot)
    assert event.event_type == parking_event.PARKED

@pytest.mark.django_db
def test_mark_parked_fails_when_lot_full(user, lot):
    lot.available_spaces = 0
    lot.save()
    with pytest.raises(ValueError):
        mark_parked(user.user_id, lot.lot_id)

@pytest.mark.django_db
def test_mark_parked_no_event_created_when_lot_full(user, lot):
    lot.available_spaces = 0
    lot.save()
    with pytest.raises(ValueError):
        mark_parked(user.user_id, lot.lot_id)
    assert parking_event.objects.filter(user_id=user.user_id).count() == 0

# TC-02: Leaving a Parking Space
@pytest.mark.django_db
def test_leave_returns_200(auth_client, lot):
    response = auth_client.post("/parking/leave/", {"lot_id": lot.lot_id})
    assert response.status_code == 200

@pytest.mark.django_db
def test_mark_left_increments_spaces(user, lot):
    mark_left(user.user_id, lot.lot_id)
    lot.refresh_from_db()
    assert lot.available_spaces == 6

@pytest.mark.django_db
def test_mark_left_creates_event(user, lot):
    mark_left(user.user_id, lot.lot_id)
    event = parking_event.objects.get(user_id=user.user_id, lot=lot)
    assert event.event_type == parking_event.LEFT

@pytest.mark.django_db
def test_mark_left_fails_when_already_full(user, lot):
    lot.available_spaces = lot.total_spaces
    lot.save()
    with pytest.raises(ValueError):
        mark_left(user.user_id, lot.lot_id)

@pytest.mark.django_db
def test_mark_left_no_event_created_when_already_full(user, lot):
    lot.available_spaces = lot.total_spaces
    lot.save()
    with pytest.raises(ValueError):
        mark_left(user.user_id, lot.lot_id)
    assert parking_event.objects.filter(user_id=user.user_id).count() == 0

# TC-03: Concurrent Parking Events
def test_concurrent_parking_no_negative_spaces(db):
    lot = parking_lot.objects.create(
        name="Test Lot",
        total_spaces=10,
        available_spaces=2,  # >=2 so both can succeed per TC-03
        latitude=40.7128,
        longitude=-74.0060
    )
    lot_id = lot.lot_id

    users = [
        user.objects.create_user(email=f"user{i}@test.com", password="pass")
        for i in range(2)
    ]
    user_ids = [u.user_id for u in users]

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
    assert lot.available_spaces == 0   # both succeeded, decremented by 2
    assert len(errors) == 0           # neither was rejected
    assert lot.available_spaces >= 0   # never went negative

# Parking Lot View Tests

@pytest.mark.django_db
def test_park_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/park/", {"lot_id": lot.lot_id})
    assert response.status_code == 401

@pytest.mark.django_db
def test_park_missing_lot_id_returns_400(auth_client):
    response = auth_client.post("/parking/park/", {})
    assert response.status_code == 400

@pytest.mark.django_db
def test_park_full_lot_returns_400(auth_client, lot):
    lot.available_spaces = 0
    lot.save()
    response = auth_client.post("/parking/park/", {"lot_id": lot.lot_id})
    assert response.status_code == 400

@pytest.mark.django_db
def test_leave_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/leave/", {"lot_id": lot.lot_id})
    assert response.status_code == 401

@pytest.mark.django_db
def test_leave_full_lot_returns_400(auth_client, lot):
    lot.available_spaces = lot.total_spaces
    lot.save()
    response = auth_client.post("/parking/leave/", {"lot_id": lot.lot_id})
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
    response = auth_client.post("/parking/action/park/", {"lot_id": lot.lot_id})
    assert response.status_code == 200

@pytest.mark.django_db
def test_request_park_fails_when_lot_not_found(auth_client):
    response = auth_client.post("/parking/action/park/", {"lot_id": 99999})
    assert response.status_code == 404

@pytest.mark.django_db
def test_request_park_fails_when_lot_full(auth_client, lot):
    lot.available_spaces = 0
    lot.save()
    response = auth_client.post("/parking/action/park/", {"lot_id": lot.lot_id})
    assert response.status_code == 400

@pytest.mark.django_db
def test_request_park_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/action/park/", {"lot_id": lot.lot_id})
    assert response.status_code == 401

@pytest.mark.django_db
def test_request_park_missing_lot_id_returns_400(auth_client):
    response = auth_client.post("/parking/action/park/", {})
    assert response.status_code == 400

@pytest.mark.django_db
def test_request_leave_returns_200(auth_client, lot, user):
    # user must have an active parked record first
    parking_event.objects.create(
        user=user,
        lot=lot,
        event_type=parking_event.PARKED
    )
    response = auth_client.post("/parking/action/leave/", {"lot_id": lot.lot_id})
    assert response.status_code == 200

@pytest.mark.django_db
def test_request_leave_fails_without_active_record(auth_client, lot):
    # no parking_event created — should be rejected
    response = auth_client.post("/parking/action/leave/", {"lot_id": lot.lot_id})
    assert response.status_code == 400

@pytest.mark.django_db
def test_request_leave_fails_when_lot_not_found(auth_client):
    response = auth_client.post("/parking/action/leave/", {"lot_id": 99999})
    assert response.status_code == 404

@pytest.mark.django_db
def test_request_leave_requires_authentication(lot):
    client = APIClient()
    response = client.post("/parking/action/leave/", {"lot_id": lot.lot_id})
    assert response.status_code == 401

@pytest.mark.django_db
def test_request_leave_missing_lot_id_returns_400(auth_client):
    response = auth_client.post("/parking/action/leave/", {})
    assert response.status_code == 400

# ─── 4.3 refresh_map() Tests ──────────────────────────────────
from unittest.mock import patch, MagicMock

@pytest.mark.django_db
def test_refresh_map_calls_group_send(lot):
    # verify refresh_map() attempts to broadcast to the parking_map group
    with patch('parking.services.async_to_sync') as mock_async_to_sync:
        mock_send = MagicMock()
        mock_async_to_sync.return_value = mock_send

        from parking.services import refresh_map
        refresh_map()

        mock_async_to_sync.assert_called_once()
        mock_send.assert_called_once()

@pytest.mark.django_db
def test_refresh_map_sends_correct_group(lot):
    # verify the broadcast targets the parking_map group specifically
    with patch('parking.services.async_to_sync') as mock_async_to_sync:
        mock_send = MagicMock()
        mock_async_to_sync.return_value = mock_send

        from parking.services import refresh_map
        refresh_map()

        call_args = mock_send.call_args[0]
        assert call_args[0] == 'parking_map'

@pytest.mark.django_db
def test_refresh_map_sends_correct_type(lot):
    # verify the message type matches the consumer handler name
    with patch('parking.services.async_to_sync') as mock_async_to_sync:
        mock_send = MagicMock()
        mock_async_to_sync.return_value = mock_send

        from parking.services import refresh_map
        refresh_map()

        call_args = mock_send.call_args[0]
        message = call_args[1]
        assert message['type'] == 'parking_update'

@pytest.mark.django_db
def test_refresh_map_includes_lot_data(lot):
    # verify the broadcast payload contains lot information
    with patch('parking.services.async_to_sync') as mock_async_to_sync:
        mock_send = MagicMock()
        mock_async_to_sync.return_value = mock_send

        from parking.services import refresh_map
        refresh_map()

        call_args = mock_send.call_args[0]
        message = call_args[1]
        assert 'data' in message
        assert 'lots' in message['data']

@pytest.mark.django_db
def test_refresh_map_called_after_mark_parked(user, lot):
    # verify refresh_map() fires automatically after mark_parked()
    with patch('parking.services.refresh_map') as mock_refresh:
        from parking.services import mark_parked
        mark_parked(user.user_id, lot.lot_id)
        mock_refresh.assert_called_once()

@pytest.mark.django_db
def test_refresh_map_called_after_mark_left(user, lot):
    # verify refresh_map() fires automatically after mark_left()
    with patch('parking.services.refresh_map') as mock_refresh:
        from parking.services import mark_left
        mark_left(user.user_id, lot.lot_id)
        mock_refresh.assert_called_once()

# ─── 4.4 Notification Subscription Tests ─────────────────────
from parking.models import notification_subscription

# --- POST /notifications/subscribe/ ---

@pytest.mark.django_db
def test_subscribe_returns_201(auth_client, lot):
    response = auth_client.post(f"/notifications/subscribe/?lot_id={lot.lot_id}")
    assert response.status_code == 201

@pytest.mark.django_db
def test_subscribe_creates_subscription_in_db(auth_client, lot, user):
    auth_client.post(f"/notifications/subscribe/?lot_id={lot.lot_id}")
    assert notification_subscription.objects.filter(user=user, lot=lot).exists()

@pytest.mark.django_db
def test_subscribe_twice_returns_200(auth_client, lot):
    auth_client.post(f"/notifications/subscribe/?lot_id={lot.lot_id}")
    response = auth_client.post(f"/notifications/subscribe/?lot_id={lot.lot_id}")
    assert response.status_code == 200

@pytest.mark.django_db
def test_subscribe_twice_does_not_duplicate(auth_client, lot, user):
    auth_client.post(f"/notifications/subscribe/?lot_id={lot.lot_id}")
    auth_client.post(f"/notifications/subscribe/?lot_id={lot.lot_id}")
    count = notification_subscription.objects.filter(user=user, lot=lot).count()
    assert count == 1

@pytest.mark.django_db
def test_subscribe_requires_authentication(lot):
    client = APIClient()
    response = client.post(f"/notifications/subscribe/?lot_id={lot.lot_id}")
    assert response.status_code == 401

@pytest.mark.django_db
def test_subscribe_missing_lot_id_returns_400(auth_client):
    response = auth_client.post("/notifications/subscribe/")
    assert response.status_code == 400

@pytest.mark.django_db
def test_subscribe_invalid_lot_returns_404(auth_client):
    response = auth_client.post("/notifications/subscribe/?lot_id=99999")
    assert response.status_code == 404

@pytest.mark.django_db
def test_notification_sent_when_lot_transitions_from_full(user, lot):
    notification_subscription.objects.create(user=user, lot=lot)
    lot.available_spaces = 0
    lot.save()

    with patch('parking.services.send_availability_notification') as mock_notify:
        with patch('parking.services.refresh_map'):
            from parking.services import mark_left
            mark_left(user.userID, lot.lot_id)
            mock_notify.assert_called_once()

@pytest.mark.django_db
def test_notification_not_sent_when_lot_not_full(user, lot):
    notification_subscription.objects.create(user=user, lot=lot)
    lot.available_spaces = 3
    lot.save()

    with patch('parking.services.send_availability_notification') as mock_notify:
        with patch('parking.services.refresh_map'):
            from parking.services import mark_left
            mark_left(user.userID, lot.lot_id)
            mock_notify.assert_not_called()

@pytest.mark.django_db
def test_notification_only_sent_to_subscribed_users(user, lot):
    lot.available_spaces = 0
    lot.save()

    with patch('parking.services.async_to_sync') as mock_async_to_sync:
        mock_send = MagicMock()
        mock_async_to_sync.return_value = mock_send
        with patch('parking.services.refresh_map'):
            from parking.services import mark_left
            mark_left(user.userID, lot.lot_id)
            mock_send.assert_not_called()