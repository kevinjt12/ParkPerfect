from rest_framework import serializers
from .models import User, Vehicle


# ── Vehicle ───────────────────────────────────────────────────

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['vehicleID', 'licensePlateNumber', 'licensePlateState']


# ── User ──────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    """Read-only full user profile, including nested vehicles."""
    vehicles = VehicleSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['userID', 'firstName', 'lastName', 'email', 'vehicles']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Used by RegisterView (POST /api/auth/register/)."""

    class Meta:
        model = User
        fields = ['firstName', 'lastName', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserLoginSerializer(serializers.Serializer):
    """
    Validates the email/password payload for LoginView.
    Does not touch the database — authentication is done in the view.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangeNameSerializer(serializers.Serializer):
    """PATCH /api/user/name/ — both fields are optional so partial updates work."""
    firstName = serializers.CharField(max_length=100, required=False)
    lastName = serializers.CharField(max_length=100, required=False)


class ChangeEmailSerializer(serializers.Serializer):
    """PATCH /api/user/email/"""
    email = serializers.EmailField()

    def validate_email(self, value):
        # Uniqueness check is also enforced in the view, but validating here
        # gives a clean serializer error response.
        request_user = self.context.get('request_user')
        if User.objects.filter(email=value).exclude(pk=request_user.pk).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    PATCH /api/user/password/
    Requires the current password for verification (plan section 4.1).
    """
    currentPassword = serializers.CharField(write_only=True)
    newPassword = serializers.CharField(write_only=True, min_length=8)


class ChangePlateSerializer(serializers.Serializer):
    """PATCH /api/user/plate/"""
    licensePlateNumber = serializers.CharField(max_length=20)
    licensePlateState = serializers.CharField(max_length=2)