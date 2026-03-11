from django.urls import path
from .views import ParkingLotsView

urlpatterns = [
    path('parking/lots/', ParkingLotsView.as_view(), name='parking-lots'),
]