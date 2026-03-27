from django.urls import path
from .views import ParkingLotsView, ParkingEventView, ParkingActionView

urlpatterns = [
    #Parking Data URL Paths
    path('parking/lots/', ParkingLotsView.as_view(), name='parking-lots'),

    #Parking Event URL Paths
    path('parking/park/', ParkingEventView.as_view(), {'action': 'park'}, name='parking-park'),
    path('parking/leave/', ParkingEventView.as_view(), {'action': 'leave'}, name='parking-leave'),

    #Parking Action URL Paths
    path('parking/map/', ParkingActionView.as_view(), name='parking-map'),
    path('parking/action/park/', ParkingActionView.as_view(), {'action': 'park'}, name='park-action-park'),
    path('parking/action/leave/', ParkingActionView.as_view(), {'action': 'leave'}, name='park-action-leave')
]