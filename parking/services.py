from .models import ParkingLot

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