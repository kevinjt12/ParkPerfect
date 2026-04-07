from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import user, vehicle
from .serializers import (
    user_serializer,
    user_registration_serializer,
    user_login_serializer,
    change_name_serializer,
    change_email_serializer,
    change_password_serializer,
    change_plate_serializer,
)
from .services import verify_credentials


# ── user Authentication ────────────────────────

class register_view(APIView):
    """
    POST /api/auth/register/
    Creates a new user with a hashed password.
    No authentication required.
    """
    def post(self, request):
        serializer = user_registration_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Return JWT tokens immediately so the client can log in right away
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_serializer(user).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class login_view(APIView):
    """
    POST /api/auth/login/
    Authenticates via email + password, returns JWT access and refresh tokens.
    Plan section 2.4: login(email, password)
    """
    def post(self, request):
        serializer = user_login_serializer(data=request.data)
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
            'user': user_serializer(user).data,
        }, status=status.HTTP_200_OK)


class logout_view(APIView):
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


# ── user Settings ──────────────────────────────

class change_name_view(APIView):
    """
    PATCH /api/user/name/
    Updates first_name and/or last_name for the authenticated user.
    Plan section 4.1: change_name(first, last)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = change_name_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.first_name = serializer.validated_data.get('first_name', user.first_name)
        user.last_name = serializer.validated_data.get('last_name', user.last_name)
        user.save()
        return Response({
            'message': 'Name updated successfully.',
            'user': user_serializer(user).data,
        }, status=status.HTTP_200_OK)


class change_email_view(APIView):
    """
    PATCH /api/user/email/
    Updates the email address for the authenticated user.
    Validates uniqueness before saving.
    Plan section 4.1: change_email(new_email)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = change_email_serializer(
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
            'user': user_serializer(user).data,
        }, status=status.HTTP_200_OK)


class change_password_view(APIView):
    """
    PATCH /api/user/password/
    Verifies the current password via verify_credentials() before updating.
    Plan section 4.1: change_password(new_password)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = change_password_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        current_password = serializer.validated_data['current_password']
        new_password = serializer.validated_data['new_password']

        # Plan section 2.4 / 4.1: verify_credentials() called before any change
        if not verify_credentials(user, current_password):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class change_plate_view(APIView):
    """
    PATCH /api/user/plate/
    Updates the license plate number and state for the user's first vehicle.
    Plan section 4.1: change_plate(new_plate, state)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = change_plate_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vehicle_record = vehicle.objects.filter(user=request.user).first()
        if not vehicle_record:
            return Response(
                {'error': 'No vehicle found for this user.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        vehicle_record.license_plate_number = serializer.validated_data['license_plate_number']
        vehicle_record.license_plate_state = serializer.validated_data['license_plate_state']
        vehicle_record.save()
        return Response({
            'message': 'License plate updated successfully.',
            'vehicle': {
                'license_plate_number': vehicle_record.license_plate_number,
                'license_plate_state': vehicle_record.license_plate_state,
            },
        }, status=status.HTTP_200_OK)

