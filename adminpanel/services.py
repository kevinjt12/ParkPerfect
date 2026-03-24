from django.db.models import Count, Avg
from django.db.models.functions import TruncHour
from parking.models import ParkingLot, ParkingEvent
from parking.services import get_lots
from users.models import User

def calculate_occupancy_rate(lot):
    """Calculates the occupancy rate for a single lot."""
    if lot.totalSpaces == 0:
        return 0.0
    return (lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces * 100


def calculate_peak_time(lot, start_date, end_date):
    """Returns the peak hour string for a single lot over a date range."""
    peak_hours = (
        ParkingEvent.objects.filter(
            lot=lot,
            eventType=ParkingEvent.PARKED,
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
        )
        #groups by hour
        .annotate(hour=TruncHour('timestamp'))
        .values('hour')
        #counts number of events in each hour
        .annotate(count=Count('eventID'))
        .order_by('-count')
    )
    peak_time = peak_hours.first()
    return peak_time['hour'].strftime('%Y-%m-%d %H:%M:%S') if peak_time else 'N/A'


def calculate_occupancy_trend(lot, start_date, end_date):
    """Returns time-series occupancy data for a single lot over a date range."""
    trend = (
        ParkingEvent.objects.filter(
            lot=lot,
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
        )
        .annotate(hour=TruncHour('timestamp'))
        .values('hour')
        .annotate(avgAvailableSpaces=Avg('lot__availableSpaces'))
        .order_by('hour')
    )
    return [
        {
            'hour': entry['hour'].strftime('%Y-%m-%d %H:%M:%S'),
            'avgAvailableSpaces': entry['avgAvailableSpaces'],
        }
        for entry in trend
    ]


def calculate_statistics(lots, start_date, end_date):
    """Aggregates statistics for all provided lots over a date range."""
    results = []
    if not lots:
        return results
    for lot in lots:
        results.append({
            'lotID': lot.lotID,
            'name': lot.name,
            'occupancyRate': calculate_occupancy_rate(lot),
            'peakTime': calculate_peak_time(lot, start_date, end_date),
            'occupancyRates': calculate_occupancy_trend(lot, start_date, end_date),
        })
    return results

######### NEEDS TESTING #########
def verify_admin(admin_id, password):
    """Verifies if the provided credentials belong to an admin user."""
    try:
        admin = User.objects.get(id=admin_id, is_staff=True)
        return admin.check_password(password)
    except User.DoesNotExist:
        return False