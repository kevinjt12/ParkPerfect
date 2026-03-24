from django.urls import path
from .views import (StatisticsView, AdminLogout, AdminLogin)
urlpatterns = [    
    path('admin/statistics/', StatisticsView.as_view(), name='statistics'),
]