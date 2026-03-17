from django.db.models import Count
from django.db.models.functions import TruncHour
from parking.models import ParkingLot, ParkingEvent
from parking.services import get_lots

def calculate_statistics(lots, start_date, end_date):
    # This is the main statistics fucntion for the admin panel.
    # 
    results = []
    for lot in lots:
        #occupancy rate
        #uses occupancy rate calculation in parkinglot model
        occupancy_rate = lot.occupancyRate

        #peak time calculation
        peak_hours = ParkingEvent.objects.filter(
            lot=lot,
            eventType=ParkingEvent.PARKED,
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
        )
        #rounds the timestamp to the nearest hour
        .annotate(hour=TruncHour('timestamp'))
        #groups by hour
        .values('hour')
        #count events by hour
        .annotate(count=Count('eventID'))
        #order by highest to lowest
        .order_by('-count')
    )
    peak_time = peak_hours.first()
    peak_time_string = (peak_time['hour'].strftime('%Y-%m-%d %H:%M:%S') if peak_time else 'N/A')
    results.append({
            'lotID': lot.lotID,
            'name': lot.name,
            'occupancyRate': occupancy_rate,
            'peakTime': peak_time_string,
        })
    return results