from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class user_manager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Emails is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)

class user(AbstractBaseUser, PermissionsMixin):
    user_id = models.AutoField(primary_key=True, db_column='userID')
    first_name = models.CharField(max_length=100, db_column='firstName')
    last_name = models.CharField(max_length=100, db_column='lastName')
    email = models.EmailField(unique=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = user_manager()

    def __str__(self):
        return f'{self.first_name} {self.last_name} <{self.email}>'



class vehicle(models.Model):
    vehicle_id = models.AutoField(primary_key=True, db_column='vehicleID')
    license_plate_number = models.CharField(max_length=20, db_column='licensePlateNumber')
    license_plate_state = models.CharField(max_length=2, db_column='licensePlateState')
    user = models.ForeignKey(user, on_delete=models.CASCADE, related_name='vehicles')

    def __str__(self):
        return f'{self.license_plate_number} ({self.license_plate_state})'

