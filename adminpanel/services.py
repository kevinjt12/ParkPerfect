from django.db.models import Count, Avg, ExpressionWrapper, IntegerField
from django.db.models.functions import TruncHour, ExtractHour
from parking.models import ParkingLot, ParkingEvent
from parking.services import get_lots
from users.models import User
from django.db.models import F
import datetime
from .models import StatisticsReport
from django.utils import timezone

def calculate_occupancy_rate(lot):
    #Calculates the occupancy rate for a single lot.
    if lot.totalSpaces == 0:
        return 0.0
    return (lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces * 100


def calculate_peak_time(lot, start_date, end_date):
    #Returns the peak hour string for a single lot over a date range.
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
    start = datetime.date.fromisoformat(str(start_date))
    end   = datetime.date.fromisoformat(str(end_date))
    num_days = max((end - start).days + 1, 1)

    parked_by_hour = (
        ParkingEvent.objects.filter(
            lot=lot,
            eventType=ParkingEvent.PARKED,
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
        )
        .annotate(hour_of_day=ExtractHour('timestamp'))
        .values('hour_of_day')
        .annotate(count=Count('eventID'))
        .order_by('hour_of_day')
    )

    left_by_hour = (
        ParkingEvent.objects.filter(
            lot=lot,
            eventType=ParkingEvent.LEFT,
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
        )
        .annotate(hour_of_day=ExtractHour('timestamp'))
        .values('hour_of_day')
        .annotate(count=Count('eventID'))
        .order_by('hour_of_day')
    )

    parked_map = {e['hour_of_day']: e['count'] for e in parked_by_hour}
    left_map   = {e['hour_of_day']: e['count'] for e in left_by_hour}

    result = []
    for hour in range(24):
        avg_parked    = parked_map.get(hour, 0) / num_days
        avg_left      = left_map.get(hour, 0)   / num_days
        net_occupied  = max(0, min(avg_parked - avg_left, lot.totalSpaces))
        avg_available = lot.totalSpaces - net_occupied

        result.append({
            'hour': f"{start_date} {hour:02d}:00:00",  # int → formatted string, no strftime needed
            'avgAvailableSpaces': avg_available,
        })

    return result


def calculate_statistics(lots, start_date, end_date):
    #Aggregates statistics for all provided lots over a date range.
    results = []
    if not lots:
        return results
    for lot in lots:
        results.append({
            'lotID': lot.lotID,
            'name': lot.name,
            'totalSpaces': lot.totalSpaces,
            'availableSpaces': lot.availableSpaces,

            'occupancyRate': calculate_occupancy_rate(lot),
            'peakTime': calculate_peak_time(lot, start_date, end_date),
            'occupancyRates': calculate_occupancy_trend(lot, start_date, end_date),
        })
    return results

def verify_admin(admin_id, password):
    #Verifies if the provided credentials belong to an admin user.
    try:
        admin = User.objects.get(id=admin_id, is_staff=True)
        return admin.check_password(password)
    except User.DoesNotExist:
        return False
    
def generate_report(start_date, end_date, lots=None):
    """
    Generates and persists a StatisticsReport.
    """
    if lots is None:
        lots = get_lots()

    stats_data = calculate_statistics(lots, start_date, end_date)

    report = StatisticsReport.objects.create(
        dateRange={
            'start': str(start_date),
            'end': str(end_date)
        },
        statistics=stats_data,
        generated_at=timezone.now()
    )
    return report


def get_report(report_id):
    """Retrieve a single report by ID"""
    try:
        return StatisticsReport.objects.get(pk=report_id)
    except StatisticsReport.DoesNotExist:
        return None