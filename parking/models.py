from django.db import models
from users.models import User

class ParkingLot(models.Model):
    lotID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    totalSpaces = models.IntegerField()
    availableSpaces = models.IntegerField()
    catalogID = models.IntegerField(default=1)

    @property
    def occupancyRate(self):
        if self.totalSpaces == 0:
            return 0.0
        return (self.totalSpaces - self.availableSpaces) / self.totalSpaces * 100

class ParkingEvent(models.Model):
    PARKED = 'PARKED'
    LEFT = 'LEFT'
    EVENT_CHOICES = [(PARKED, 'Parked'), (LEFT, 'Left')]

    eventID = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lot = models.ForeignKey(ParkingLot, on_delete=models.CASCADE)
    eventType = models.CharField(max_length=10, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)