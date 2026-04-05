from django.urls import path
from .views import (GenerateReportView, ReportDetailView, ReportExportView, StatisticsView, AdminLogout, AdminLogin)
urlpatterns = [    
    path('admin/statistics/', StatisticsView.as_view(), name='statistics'),
    path('panel/login/', AdminLogin.as_view(), name='admin-login'),
    path('panel/logout/', AdminLogout.as_view(), name='admin-logout'),


    #reporting
    path('reports/generate/', GenerateReportView.as_view(), name='generate-report'),
    path('reports/<int:pk>/', ReportDetailView.as_view(), name='report-detail'),
    path('reports/<int:pk>/export/', ReportExportView.as_view(), name='report-export'),
    
]