from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/map/', consumers.parking_map_consumer.as_asgi()),
]

