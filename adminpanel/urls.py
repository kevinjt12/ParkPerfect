from django.urls import path
from .views import (StatisticsView, AdminLogout, AdminLogin)
urlpatterns = [    
    path('admin/statistics/', StatisticsView.as_view(), name='statistics'),
    path('auth/adminlogin/', AdminLogin.as_view(), name='admin-login'),
    path('auth/adminlogout/', AdminLogout.as_view(), name='admin-logout'),
]