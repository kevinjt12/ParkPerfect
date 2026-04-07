from rest_framework import serializers
from .models import user, vehicle


# ── vehicle ───────────────────────────────────────────────────

class vehicle_serializer(serializers.ModelSerializer):
    class Meta:
        model = vehicle
        fields = ['vehicle_id', 'license_plate_number', 'license_plate_state']


# ── user ──────────────────────────────────────────────────────

class user_serializer(serializers.ModelSerializer):
    """Read-only full user profile, including nested vehicles."""
    vehicles = vehicle_serializer(many=True, read_only=True)

    class Meta:
        model = user
        fields = ['user_id', 'first_name', 'last_name', 'email', 'vehicles']


class user_registration_serializer(serializers.ModelSerializer):
    """Used by register_view (POST /api/auth/register/)."""

    class Meta:
        model = user
        fields = ['first_name', 'last_name', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return user.objects.create_user(**validated_data)


class user_login_serializer(serializers.Serializer):
    """
    Validates the email/password payload for login_view.
    Does not touch the database — authentication is done in the view.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class change_name_serializer(serializers.Serializer):
    """PATCH /api/user/name/ — both fields are optional so partial updates work."""
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)


class change_email_serializer(serializers.Serializer):
    """PATCH /api/user/email/"""
    email = serializers.EmailField()

    def validate_email(self, value):
        # Uniqueness check is also enforced in the view, but validating here
        # gives a clean serializer error response.
        request_user = self.context.get('request_user')
        if user.objects.filter(email=value).exclude(pk=request_user.pk).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value


class change_password_serializer(serializers.Serializer):
    """
    PATCH /api/user/password/
    Requires the current password for verification (plan section 4.1).
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class change_plate_serializer(serializers.Serializer):
    """PATCH /api/user/plate/"""
    license_plate_number = serializers.CharField(max_length=20)
    license_plate_state = serializers.CharField(max_length=2)

