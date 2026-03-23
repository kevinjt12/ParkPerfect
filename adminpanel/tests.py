from django.test import TestCase
from django.utils import timezone
from datetime import date
from parking.models import ParkingLot, ParkingEvent
from adminpanel.services import calculate_statistics
from users.models import User

class CalculateStatisticsTestCase(TestCase):

    def setUp(self):
        # Creating test data
        self.lot = ParkingLot.objects.create(
            lotID="1",
            name="Test Lot",
            latitude=40.712776,
            longitude=-74.005974,
            totalSpaces=100,
            availableSpaces=50,
            catalogID=1
        )
        self.user = User.objects.create_user(
            firstName='Test',
            lastName='User',
            password='testpass',
            email='testemail@example.com'
            )  
        
        ParkingEvent.objects.create(
            lot=self.lot,
            user=self.user,
            eventType='PARKED',
            timestamp=timezone.now()
        )

    def test_returns_results_for_each_lot(self):
        # Tests that the function should return a list of results for each parking lot.
        results = calculate_statistics(ParkingLot.objects.all(),date.today(), date.today())
        self.assertEqual(len(results),1)
        self.assertEqual(results[0]['lotID'], self.lot.lotID)

    def test_peak_time_is_blank_when_no_events(self):
        # Tests that peak time should be N/A since there are not parking events in database.
        ParkingEvent.objects.all().delete()
        results = calculate_statistics(ParkingLot.objects.all(),date.today(), date.today())
        self.assertEqual(results[0]['peakTime'], 'N/A')

    def test_occupancy_rate_is_correct(self):
        # Tests that the occupancy rate should be 50% since there are 50 spaces out of 100.
        results = calculate_statistics(ParkingLot.objects.all(),date.today(), date.today())
        self.assertEqual(results[0]['occupancyRate'], 50)

    def test_multiple_lots_all_appear_in_results(self):
        # Tests that all parking lots should appear in the results.
        lot2 = ParkingLot.objects.create(
            lotID="2",
            name="Test Lot 2",
            latitude=40.712776,
            longitude=-74.005974,
            totalSpaces=200,
            availableSpaces=150,
            catalogID=1
        )
        ParkingEvent.objects.create(
        lot=lot2,
        user=self.user,
        eventType='PARKED',
        )
        results = calculate_statistics(
            ParkingLot.objects.all(),
            date.today(),
            date.today()
        )
        self.assertEqual(len(results),2)
        lot_ids = [result['lotID'] for result in results]
        self.assertIn(self.lot.lotID,lot_ids)
        self.assertIn(lot2.lotID,lot_ids)
    
    def test_empty_lots_returns_empty_results(self):
        # Tests that if there are no parking lots, the function should return an empty list.
        results = calculate_statistics(ParkingLot.objects.none(),date.today(), date.today())
        self.assertEqual(results,[])
    
    def test_no_events_in_date_range_returns_na_peak_time(self):
        # Tests that if there are no parking events in the specified date range, the peak time should be N/A.
        ParkingEvent.objects.all().delete()
        results = calculate_statistics(ParkingLot.objects.all(),date.today(), date.today())
        self.assertEqual(results[0]['peakTime'], 'N/A')