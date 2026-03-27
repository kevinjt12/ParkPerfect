from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .services import get_lots, get_available_spaces, mark_parked, mark_left
from .serializers import ParkingLotSerializer
from .models import ParkingLot, ParkingEvent

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

class ParkingActionView(APIView):
    #is Authenicated ensure that the user logged in
    permission_classes = [IsAuthenticated]

    def post(self, request, action):
        lot_id = request.data.get('lot_id')

        if not lot_id:
            return Response({'error': 'lot_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            lot = ParkingLot.objects.get(pk=lot_id)
        except ParkingLot.DoesNotExist:
            return Response({'error': 'Parking lot not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if action == 'park':
            if lot.availableSpaces <= 0:
                return Response({'error': 'This lot is full.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                mark_parked(request.user.userID, lot_id)
                return Response({'status': 'Parked successfully'}, status=status.HTTP_200_OK)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        elif action == 'leave':
            has_active_parking = ParkingEvent.objects.filter(
                user_id=request.user.userID,
                lot_id=lot_id,
                eventType=ParkingEvent.PARKED
            ).exists()

            if not has_active_parking:
                return Response({'error': 'No active parking record found.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                mark_left(request.user.userID, lot_id)
                return Response({'status': 'Left successfully'}, status=status.HTTP_200_OK)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
    def get(self, request):
        # this get method allows the parking map to view the current parking lot data, including available spaces
        lots = get_lots()
        serializer = ParkingLotSerializer(lots, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)