from django.urls import path
from .views import (
    login_view, logout_view, register_view,
    change_name_view, change_email_view,
    change_password_view, change_plate_view
)

urlpatterns = [
    path('auth/register/', register_view.as_view(), name='register'),
    path('auth/login/', login_view.as_view(), name='login'),
    path('auth/logout/', logout_view.as_view(), name='logout'),
    path('user/name/', change_name_view.as_view(), name='change-name'),
    path('user/email/', change_email_view.as_view(), name='change-email'),
    path('user/password/', change_password_view.as_view(), name='change-password'),
    path('user/plate/', change_plate_view.as_view(), name='change-plate'),
]

