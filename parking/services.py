from .models import ParkingLot, ParkingEvent
from .serializers import ParkingLotSerializer
from django.db import transaction
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

# ------------ Parking Data Module Services ------------
def get_lots():
    #Returns every row in the parking_parkinglot tables. This gets all the lots for the specific campus
    return ParkingLot.objects.all()

def get_available_spaces(lot_id):
    #returns the number of spaces left
    #.get(pk=lot_id) finds one specific lot by its primary key
    # put it in try except in case the lot id does not exist.
    try:
        lot = ParkingLot.objects.get(pk=lot_id)
        return lot.availableSpaces
    except ParkingLot.DoesNotExist:
        return None
    
# ------------ Parking Map Module Logic ---------------
def refresh_map():
    #sends parking map data to frontend via websocket
    channel_layer = get_channel_layer()
    lots = ParkingLot.objects.all()
    serializer = ParkingLotSerializer(lots, many=True)
    async_to_sync(channel_layer.group_send)(
        'parking_map',
        {
            'type': 'parking_update',
            'data': {
                'type': 'lot_update',
                'lots': serializer.data
            }
        }
    )


# ------------ ParkingLot Event Module Services ------------
@transaction.atomic
def mark_parked(user_id, lot_id):
    #marks the user as parked in a lot.
    lot = ParkingLot.objects.select_for_update().get(pk=lot_id) #tc-03 race condition guard with select_for_update()

    if lot.availableSpaces <= 0:
        raise ValueError('No avilable spaces in this lot.')
    
    ParkingEvent.objects.create(
        user_id=user_id,
        lot=lot,
        eventType=ParkingEvent.PARKED
    )
    lot.availableSpaces -= 1
    lot.save()
    refresh_map()

@transaction.atomic
def mark_left(user_id, lot_id):
    #marks the user has left a parking lot.
    lot = ParkingLot.objects.select_for_update().get(pk=lot_id) #tc-=03 race condition guard with select_for_update()

    if lot.availableSpaces >= lot.totalSpaces:
        raise ValueError('Available spaces cannot exceed total spaces.')
    
    ParkingEvent.objects.create(
        user_id=user_id,
        lot=lot,
        eventType=ParkingEvent.LEFT
    )
    lot.availableSpaces += 1
    lot.save()
    refresh_map()
