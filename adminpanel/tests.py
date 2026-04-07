from django.test import TestCase
from django.utils import timezone
from datetime import date
from parking.models import parking_lot, parking_event
from adminpanel.services import calculate_statistics
from users.models import user

class calculate_statistics_test_case(TestCase):

    def setUp(self):
        # Creating test data
        self.lot = parking_lot.objects.create(
            lot_id="1",
            name="Test Lot",
            latitude=40.712776,
            longitude=-74.005974,
            total_spaces=100,
            available_spaces=50,
            catalog_id=1
        )
        self.user = user.objects.create_user(
            first_name='Test',
            last_name='user',
            password='testpass',
            email='testemail@example.com'
            )  
        
        parking_event.objects.create(
            lot=self.lot,
            user=self.user,
            event_type='PARKED',
            timestamp=timezone.now()
        )

    def test_returns_results_for_each_lot(self):
        # Tests that the function should return a list of results for each parking lot.
        results = calculate_statistics(parking_lot.objects.all(),date.today(), date.today())
        self.assertEqual(len(results),1)
        self.assertEqual(results[0]['lot_id'], self.lot.lot_id)

    def test_peak_time_is_blank_when_no_events(self):
        # Tests that peak time should be N/A since there are not parking events in database.
        parking_event.objects.all().delete()
        results = calculate_statistics(parking_lot.objects.all(),date.today(), date.today())
        self.assertEqual(results[0]['peak_time'], 'N/A')

    def test_occupancy_rate_is_correct(self):
        # Tests that the occupancy rate should be 50% since there are 50 spaces out of 100.
        results = calculate_statistics(parking_lot.objects.all(),date.today(), date.today())
        self.assertEqual(results[0]['occupancy_rate'], 50)

    def test_multiple_lots_all_appear_in_results(self):
        # Tests that all parking lots should appear in the results.
        lot2 = parking_lot.objects.create(
            lot_id="2",
            name="Test Lot 2",
            latitude=40.712776,
            longitude=-74.005974,
            total_spaces=200,
            available_spaces=150,
            catalog_id=1
        )
        parking_event.objects.create(
        lot=lot2,
        user=self.user,
        event_type='PARKED',
        )
        results = calculate_statistics(
            parking_lot.objects.all(),
            date.today(),
            date.today()
        )
        self.assertEqual(len(results),2)
        lot_ids = [result['lot_id'] for result in results]
        self.assertIn(self.lot.lot_id,lot_ids)
        self.assertIn(lot2.lot_id,lot_ids)
    
    def test_empty_lots_returns_empty_results(self):
        # Tests that if there are no parking lots, the function should return an empty list.
        results = calculate_statistics(parking_lot.objects.none(),date.today(), date.today())
        self.assertEqual(results,[])
    
    def test_no_events_in_date_range_returns_na_peak_time(self):
        # Tests that if there are no parking events in the specified date range, the peak time should be N/A.
        parking_event.objects.all().delete()
        results = calculate_statistics(parking_lot.objects.all(),date.today(), date.today())
        self.assertEqual(results[0]['peak_time'], 'N/A')

