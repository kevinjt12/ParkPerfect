from django.urls import path
from .views import ParkingLotsView, ParkingEventView

urlpatterns = [
    path('parking/lots/', ParkingLotsView.as_view(), name='parking-lots'),
    path('parking/park/', ParkingEventView.as_view(), {'action': 'park'}, name='parking-park'),
    path('parking/leave/', ParkingEventView.as_view(), {'action': 'leave'}, name='parking-leave')
]