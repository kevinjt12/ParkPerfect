from rest_framework import serializers
from .models import ParkingLot, ParkingEvent

class ParkingLotSerializer(serializers.ModelSerializer):
    occupancyRate = serializers.ReadOnlyField()

    class Meta:
        model = ParkingLot
        fields = [
            'lotID', 'name', 'latitude', 'longitude',
            'totalSpaces', 'availableSpaces', 'occupancyRate', 'catalogID'
        ]

class ParkingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingEvent
        fields = ['eventID', 'user', 'lot', 'eventType', 'timestamp']
        read_only_fields = ['timestamp']