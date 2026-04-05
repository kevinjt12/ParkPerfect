from django.contrib.auth import authenticate
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date

from users.models import User
from users.serializers import UserSerializer
from parking.services import get_lots

from .services import calculate_statistics, generate_report, get_report
from .models import StatisticsReport
from .serializers import StatisticsReportSerializer

import csv
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

class AdminAuthView(APIView):
    #base view for all admin endpoints. Requires that is_staff =true
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    
class StatisticsView(AdminAuthView):
    permission_classes = [AllowAny]

    def get(self, request):
        start_date = request.query_params.get('start', str(date.today()))
        end_date = request.query_params.get('end', str(date.today()))
        lots = get_lots()
        statistics = calculate_statistics(lots, start_date, end_date)

        return Response({
            'dateRange': f'{start_date} to {end_date}',
            'statistics': statistics
        })
    
class AdminLogin(APIView):
    #This is the same methodology as the user login, but just checks if_staff is true instead of just if the user exists
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_staff:
            return Response({'error': 'Not an admin user'}, status=status.HTTP_403_FORBIDDEN)
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })
class AdminLogout(AdminAuthView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


# ====================== REPORTING VIEWS ======================

class GenerateReportView(APIView):
    """POST /api/admin/reports/generate/"""
    permission_classes = [IsAdminUser]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        start_date = request.data.get('start', str(date.today()))
        end_date = request.data.get('end', str(date.today()))

        report = generate_report(start_date, end_date)

        return Response({
            'message': 'Report generated successfully',
            'report_id': report.reportID,
            'dateRange': report.dateRange
        }, status=status.HTTP_201_CREATED)


class ReportDetailView(APIView):
    """GET /api/admin/reports/{id}/"""
    permission_classes = [IsAdminUser]
    authentication_classes = [JWTAuthentication]

    def get(self, request, pk=None):
        report = get_report(pk)
        if not report:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StatisticsReportSerializer(report)
        return Response(serializer.data)


class ReportExportView(APIView):
    """GET /api/admin/reports/{id}/export/?format=pdf|csv"""
    permission_classes = [IsAdminUser]
    authentication_classes = [JWTAuthentication]

    def get(self, request, pk=None):
        report = get_report(pk)
        if not report:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)

        export_format = request.query_params.get('format', 'pdf').lower()

        if export_format == 'pdf':
            return self._export_pdf(report)
        elif export_format == 'csv':
            return self._export_csv(report)
        else:
            return Response({'error': 'Invalid format. Use ?format=pdf or ?format=csv'},
                            status=status.HTTP_400_BAD_REQUEST)

    def _export_pdf(self, report):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, 
                                leftMargin=inch, rightMargin=inch,
                                topMargin=inch, bottomMargin=inch)
        
        styler = getSampleStyleSheet()
        story = []

        story.append(Paragraph(f"Parking Lot Statistics Report #{report.reportID}", styler['Title']))
        story.append(Spacer(1, 0.25 * inch))
        
        story.append(Paragraph(
            f"Date Range: {report.dateRange.get('start')} – {report.dateRange.get('end')}", 
            styler['Normal']
        ))
        story.append(Paragraph(
            f"Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}", 
            styler['Normal']
        ))
        story.append(Spacer(1, 0.5 * inch))

        # Table
        table_data = [["Lot Name", "Total Spaces", "Occupancy Rate (%)", "Peak Time"]]

        for stat in report.statistics or []:
            table_data.append([
                stat.get('name', 'N/A'),
                stat.get('totalSpaces', 0),
                f"{stat.get('occupancyRate', 0):.1f}",
                stat.get('peakTime', 'N/A')
            ])

        table = Table(table_data, colWidths=[2.5*inch, inch, inch, 1.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        story.append(table)
        doc.build(story)

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="parking_report_{report.reportID}.pdf"'
        return response

    def _export_csv(self, report):
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        
        writer.writerow(['Lot Name', 'Total Spaces', 'Available Spaces', 
                        'Occupancy Rate (%)', 'Peak Time'])

        for stat in report.statistics or []:
            writer.writerow([
                stat.get('name'),
                stat.get('totalSpaces'),
                stat.get('availableSpaces'),
                round(stat.get('occupancyRate', 0), 2),
                stat.get('peakTime', 'N/A')
            ])

        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="parking_report_{report.reportID}.csv"'
        return response