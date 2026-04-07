from .models import parking_lot, parking_event
from .serializers import parking_lot_serializer
from django.db import transaction
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

# ------------ Parking Data Module Services ------------
def get_lots():
    #Returns every row in the parking_parkinglot tables. This gets all the lots for the specific campus
    return parking_lot.objects.all()

def get_available_spaces(lot_id):
    #returns the number of spaces left
    #.get(pk=lot_id) finds one specific lot by its primary key
    # put it in try except in case the lot id does not exist.
    try:
        lot = parking_lot.objects.get(pk=lot_id)
        return lot.available_spaces
    except parking_lot.DoesNotExist:
        return None
    
# ------------ Parking Map Module Logic ---------------
def refresh_map():
    #sends parking map data to frontend via websocket
    channel_layer = get_channel_layer()
    lots = parking_lot.objects.all()
    serializer = parking_lot_serializer(lots, many=True)
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


# ------------ parking_lot Event Module Services ------------
@transaction.atomic
def mark_parked(user_id, lot_id):
    #marks the user as parked in a lot.
    lot = parking_lot.objects.select_for_update().get(pk=lot_id) #tc-03 race condition guard with select_for_update()

    if lot.available_spaces <= 0:
        raise ValueError('No avilable spaces in this lot.')
    
    parking_event.objects.create(
        user_id=user_id,
        lot=lot,
        event_type=parking_event.PARKED
    )
    lot.available_spaces -= 1
    lot.save()
    refresh_map()

@transaction.atomic
def mark_left(user_id, lot_id):
    #marks the user has left a parking lot.
    lot = parking_lot.objects.select_for_update().get(pk=lot_id) #tc-=03 race condition guard with select_for_update()

    if lot.available_spaces >= lot.total_spaces:
        raise ValueError('Available spaces cannot exceed total spaces.')
    
    parking_event.objects.create(
        user_id=user_id,
        lot=lot,
        event_type=parking_event.LEFT
    )
    lot.available_spaces += 1
    lot.save()
    refresh_map()


