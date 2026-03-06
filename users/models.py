from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

class User(AbstractBaseUser):
    userID = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=100)
    lastName = models.CharField(max_length=100)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    objects = UserManager()

class Vehicle(models.Model):
    vehicleID = models.AutoField(primary_key=True)
    licensePlateNumber = models.CharField(max_length=20)
    licensePlateState = models.CharField(max_length=2)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')