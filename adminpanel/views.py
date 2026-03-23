from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from datetime import date
from parking.services import get_lots
from .services import calculate_statistics
from .models import StatisticsReport

class StatisticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        start_date = request.query.params.get('start', str(date.today()))
        end_date = request.query.params.get('end', str(date.today()))
        lots = get_lots()
        statistics = calculate_statistics(lots, start_date, end_date)

        return Response({
            'dateRange': f'{start_date} to {end_date}',
            'statistics': statistics
        })