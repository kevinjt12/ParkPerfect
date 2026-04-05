from rest_framework import serializers
from .models import Admin, StatisticsReport
from parking.serializers import ParkingLotSerializer

class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ['adminID', 'firstName', 'lastName', 'email']
        extra_kwargs = {'password': {'write_only': True}}

from rest_framework import serializers
from .models import StatisticsReport

class StatisticsReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatisticsReport
        fields = [
            'reportID',
            'dateRange',
            'statistics',      # This contains all the lot data + trends
            'generated_at',
            'created_at'
        ]
        read_only_fields = ['reportID', 'generated_at', 'created_at']