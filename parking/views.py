from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import get_lots, get_available_spaces
from .serializers import ParkingLotSerializer

class ParkingLotsView(APIView):
    #is Authenicated ensure that the user logged in
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lots = get_lots() #call get lots function
        serializer = ParkingLotSerializer(lots, many=True) #convert to JSON
        return Response(serializer.data) #Send back in http response.