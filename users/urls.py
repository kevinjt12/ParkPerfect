from django.urls import path
from .views import (
    LoginView, LogoutView, RegisterView,
    ChangeNameView, ChangeEmailView,
    ChangePasswordView, ChangePlateView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('user/name/', ChangeNameView.as_view(), name='change-name'),
    path('user/email/', ChangeEmailView.as_view(), name='change-email'),
    path('user/password/', ChangePasswordView.as_view(), name='change-password'),
    path('user/plate/', ChangePlateView.as_view(), name='change-plate'),
]