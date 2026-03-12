from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Vehicle
from .serializers import UserSerializer, UserRegistrationSerializer

# ── Authentication ────────────────────────────────────────────

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )

class RegisterView(APIView):
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ── Helper ────────────────────────────────────────────────────

def verify_credentials(user, password):
    return user.check_password(password)

# ── User Settings ─────────────────────────────────────────────

class ChangeNameView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        user.firstName = request.data.get('firstName', user.firstName)
        user.lastName = request.data.get('lastName', user.lastName)
        user.save()
        return Response({'message': 'Name updated successfully'})

class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        new_email = request.data.get('email')
        if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
            return Response(
                {'error': 'Email already in use'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.email = new_email
        user.save()
        return Response({'message': 'Email updated successfully'})

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        current_password = request.data.get('currentPassword')
        new_password = request.data.get('newPassword')
        if not verify_credentials(user, current_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully'})

class ChangePlateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        new_plate = request.data.get('licensePlateNumber')
        new_state = request.data.get('licensePlateState')
        vehicle = Vehicle.objects.filter(user=user).first()
        if not vehicle:
            return Response(
                {'error': 'No vehicle found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )
        vehicle.licensePlateNumber = new_plate
        vehicle.licensePlateState = new_state
        vehicle.save()
        return Response({'message': 'Plate updated successfully'})