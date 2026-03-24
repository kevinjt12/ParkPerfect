from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .services import get_lots, get_available_spaces, mark_parked, mark_left
from .serializers import ParkingLotSerializer

class ParkingLotsView(APIView):
    #is Authenicated ensure that the user logged in
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lots = get_lots() #call get lots function
        serializer = ParkingLotSerializer(lots, many=True) #convert to JSON
        return Response(serializer.data) #Send back in http response.

class ParkingEventView(APIView):
    #is Authenicated ensure that the user logged in
    permission_classes = [IsAuthenticated]

    def post(self, request, action):
        lot_id = request.data.get('lot_id')

        if not lot_id:
            return Response({'error': 'lot_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if action == 'park':
                mark_parked(request.user.userID, lot_id)
            elif action == 'leave':
                mark_left(request.user.userID, lot_id)
            
            return Response({'status': 'success'}, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
