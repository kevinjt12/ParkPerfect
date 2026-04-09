from django.urls import path
from .views import (generate_report_view, report_detail_view, report_export_view, statistics_view, admin_logout, admin_login, report_list_view)
urlpatterns = [    
    path('admin/statistics/', statistics_view.as_view(), name='statistics'),
    path('panel/login/', admin_login.as_view(), name='admin-login'),
    path('panel/logout/', admin_logout.as_view(), name='admin-logout'),


    #reporting
    
    path('reports/generate/', generate_report_view.as_view(), name='generate-report'),
    path('reports/<int:pk>/export/', report_export_view.as_view(), name='report-export'),
    path('reports/<int:pk>/', report_detail_view.as_view(), name='report-detail'),
    path('reports/', report_list_view.as_view(), name='report-list'),
]

