from django.db import models
from users.models import user

class parking_lot(models.Model):
    lot_id = models.AutoField(primary_key=True, db_column='lotID')
    name = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    total_spaces = models.IntegerField(db_column='totalSpaces')
    available_spaces = models.IntegerField(db_column='availableSpaces')
    catalog_id = models.IntegerField(default=1, db_column='catalogID')

    @property
    def occupancy_rate(self):
        if self.total_spaces == 0:
            return 0.0
        return (self.total_spaces - self.available_spaces) / self.total_spaces * 100

    class Meta:
        db_table = 'parking_parkinglot'

class parking_event(models.Model):
    PARKED = 'PARKED'
    LEFT = 'LEFT'
    EVENT_CHOICES = [(PARKED, 'Parked'), (LEFT, 'Left')]

    event_id = models.AutoField(primary_key=True, db_column='eventID')
    user = models.ForeignKey(user, on_delete=models.CASCADE)
    lot = models.ForeignKey(parking_lot, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=10, choices=EVENT_CHOICES, db_column='eventType')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'parking_parkingevent'

