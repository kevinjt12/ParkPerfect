# adminpanel/models.py
from django.db import models
from parking.models import ParkingLot

class Admin(models.Model):
    adminID = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=100)
    lastName = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

class StatisticsReport(models.Model):
    reportID = models.AutoField(primary_key=True)
    lot = models.ForeignKey(ParkingLot, on_delete=models.CASCADE)
    dateRange = models.CharField(max_length=100)
    occupancyRates = models.FloatField()
    peakTimes = models.CharField(max_length=100)