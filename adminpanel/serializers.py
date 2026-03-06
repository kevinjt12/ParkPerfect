from rest_framework import serializers
from .models import Admin, StatisticsReport
from parking.serializers import ParkingLotSerializer

class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ['adminID', 'firstName', 'lastName', 'email']
        extra_kwargs = {'password': {'write_only': True}}

class StatisticsReportSerializer(serializers.ModelSerializer):
    lot = ParkingLotSerializer(read_only=True)
    lot_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('parking').models.ParkingLot.objects.all(),
        source='lot',
        write_only=True
    )

    class Meta:
        model = StatisticsReport
        fields = ['reportID', 'lot', 'lot_id', 'dateRange', 'occupancyRates', 'peakTimes']