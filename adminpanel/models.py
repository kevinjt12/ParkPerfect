# adminpanel/models.py
from django.db import models
from parking.models import parking_lot
from django.utils import timezone

class admin(models.Model):
    # admin model
    #not used at current. Can be used for future admin authentication and management features. Admin are registered as users at current.

    admin_id = models.AutoField(primary_key=True, db_column='adminID')
    first_name = models.CharField(max_length=100, db_column='firstName')
    last_name = models.CharField(max_length=100, db_column='lastName')
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

class statistics_report(models.Model):
    #statistic report model to store generated reports for historical reference and trend analysis. This allows us to keep a record of past reports and analyze trends over time.
    report_id = models.AutoField(primary_key=True, db_column='reportID')
    date_range = models.JSONField(db_column='dateRange')           # Stores {'start': '2026-04-01', 'end': '2026-04-02'}
    statistics = models.JSONField()          # Stores full list of lot statistics + trends
    generated_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        #SQL cofigurations
        db_table = 'adminpanel_statisticsreport'
        ordering = ['-generated_at']
        verbose_name = "Statistics Report"
        verbose_name_plural = "Statistics Reports"

    def __str__(self):
        return f"Report {self.report_id} ({self.date_range.get('start')} to {self.date_range.get('end')})"

