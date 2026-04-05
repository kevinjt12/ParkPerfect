# adminpanel/models.py
from django.db import models
from parking.models import ParkingLot
from django.utils import timezone

class Admin(models.Model):
    adminID = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=100)
    lastName = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

class StatisticsReport(models.Model):
    reportID = models.AutoField(primary_key=True)
    dateRange = models.JSONField()           # Stores {'start': '2026-04-01', 'end': '2026-04-02'}
    statistics = models.JSONField()          # Stores full list of lot statistics + trends
    generated_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-generated_at']
        verbose_name = "Statistics Report"
        verbose_name_plural = "Statistics Reports"

    def __str__(self):
        return f"Report {self.reportID} ({self.dateRange.get('start')} to {self.dateRange.get('end')})"