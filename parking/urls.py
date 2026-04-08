from django.urls import path
from .views import parking_lots_view, parking_event_view, parking_action_view, notification_subscription_view

urlpatterns = [
    #Parking Data URL Paths
    path('parking/lots/', parking_lots_view.as_view(), name='parking-lots'),

    #Parking Event URL Paths
    path('parking/park/', parking_event_view.as_view(), {'action': 'park'}, name='parking-park'),
    path('parking/leave/', parking_event_view.as_view(), {'action': 'leave'}, name='parking-leave'),

    #Parking Action URL Paths
    path('parking/map/', parking_action_view.as_view(), name='parking-map'),
    path('parking/action/park/', parking_action_view.as_view(), {'action': 'park'}, name='park-action-park'),
    path('parking/action/leave/', parking_action_view.as_view(), {'action': 'leave'}, name='park-action-leave'),
    path('notifications/subscribe/', notification_subscription_view.as_view(), name='notifications-subscribe')
]

