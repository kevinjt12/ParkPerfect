from django.urls import path
from .views import (StatisticsView, AdminLogout, AdminLogin)
urlpatterns = [    
    path('admin/statistics/', StatisticsView.as_view(), name='statistics'),
    path('admin/login/', AdminLogin.as_view(), name='admin-login'),
    path('admin/logout/', AdminLogout.as_view(), name='admin-logout')
    
]