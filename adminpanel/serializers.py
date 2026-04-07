from rest_framework import serializers
from .models import admin, statistics_report
from parking.serializers import parking_lot_serializer

class admin_serializer(serializers.ModelSerializer):
    #converts model to json for http response
    class Meta:
        model = admin
        fields = ['admin_id', 'first_name', 'last_name', 'email']
        extra_kwargs = {'password': {'write_only': True}}

from rest_framework import serializers
from .models import statistics_report

class statistics_report_serializer(serializers.ModelSerializer):
    #converts model to json
    class Meta:
        model = statistics_report
        fields = [
            'report_id',
            'date_range',
            'statistics',      
            'generated_at',
            'created_at'
        ]
        read_only_fields = ['report_id', 'generated_at', 'created_at']

