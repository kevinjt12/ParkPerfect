from rest_framework import serializers
from .models import parking_lot, parking_event

class parking_lot_serializer(serializers.ModelSerializer):
    occupancy_rate = serializers.ReadOnlyField()

    class Meta:
        model = parking_lot
        fields = [
            'lot_id', 'name', 'latitude', 'longitude',
            'total_spaces', 'available_spaces', 'occupancy_rate', 'catalog_id'
        ]

class parking_event_serializer(serializers.ModelSerializer):
    class Meta:
        model = parking_event
        fields = ['event_id', 'user', 'lot', 'event_type', 'timestamp']
        read_only_fields = ['timestamp']

