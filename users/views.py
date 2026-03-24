from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import User, Vehicle
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    ChangeNameSerializer,
    ChangeEmailSerializer,
    ChangePasswordSerializer,
    ChangePlateSerializer,
)
from .services import verify_credentials


# ── User Authentication ────────────────────────

class RegisterView(APIView):
    """
    POST /api/auth/register/
    Creates a new user with a hashed password.
    No authentication required.
    """
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Return JWT tokens immediately so the client can log in right away
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticates via email + password, returns JWT access and refresh tokens.
    Plan section 2.4: login(email, password)
    """
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Django's authenticate() uses USERNAME_FIELD ('email') via the
        # username kwarg when a custom user model is configured.
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token so it cannot be reused.
    Plan section 2.4: logout(user_id)
    Requires: { "refresh": "<refresh_token>" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {'error': 'Invalid or already blacklisted token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ── User Settings ──────────────────────────────

class ChangeNameView(APIView):
    """
    PATCH /api/user/name/
    Updates firstName and/or lastName for the authenticated user.
    Plan section 4.1: change_name(first, last)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ChangeNameSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.firstName = serializer.validated_data.get('firstName', user.firstName)
        user.lastName = serializer.validated_data.get('lastName', user.lastName)
        user.save()
        return Response({
            'message': 'Name updated successfully.',
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class ChangeEmailView(APIView):
    """
    PATCH /api/user/email/
    Updates the email address for the authenticated user.
    Validates uniqueness before saving.
    Plan section 4.1: change_email(new_email)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ChangeEmailSerializer(
            data=request.data,
            context={'request_user': request.user},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.email = serializer.validated_data['email']
        user.save()
        return Response({
            'message': 'Email updated successfully.',
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    PATCH /api/user/password/
    Verifies the current password via verify_credentials() before updating.
    Plan section 4.1: change_password(new_password)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        current_password = serializer.validated_data['currentPassword']
        new_password = serializer.validated_data['newPassword']

        # Plan section 2.4 / 4.1: verify_credentials() called before any change
        if not verify_credentials(user, current_password):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class ChangePlateView(APIView):
    """
    PATCH /api/user/plate/
    Updates the license plate number and state for the user's first vehicle.
    Plan section 4.1: change_plate(new_plate, state)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ChangePlateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vehicle = Vehicle.objects.filter(user=request.user).first()
        if not vehicle:
            return Response(
                {'error': 'No vehicle found for this user.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        vehicle.licensePlateNumber = serializer.validated_data['licensePlateNumber']
        vehicle.licensePlateState = serializer.validated_data['licensePlateState']
        vehicle.save()
        return Response({
            'message': 'License plate updated successfully.',
            'vehicle': {
                'licensePlateNumber': vehicle.licensePlateNumber,
                'licensePlateState': vehicle.licensePlateState,
            },
        }, status=status.HTTP_200_OK)