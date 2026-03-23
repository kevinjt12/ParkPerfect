from django.contrib.auth import authenticate
from rest_framework import status
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date
from users.models import User
from users.serializers import UserSerializer
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
    
class AdminLogin(APIView):
    #This is the same methodology as the user login, but just checks if_staff is true instead of just if the user exists
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_staff:
            return Response({'error': 'Not an admin user'}, status=status.HTTP_403_FORBIDDEN)
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })
class AdminLogout(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
    