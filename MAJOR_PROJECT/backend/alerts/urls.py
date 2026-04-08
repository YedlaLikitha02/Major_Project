from django.urls import path
from .views import update_location
from .views import (
    send_alert,
    police_dashboard,
    hospital_dashboard,
    admin_dashboard,
    resolve_alert,
    resolve_alert_api,
    home,
    police_alerts_api,
    hospital_alerts_api,
    admin_alerts_api,
    login_api
)

urlpatterns = [
    path('', home),

    # HTML dashboards (old ones)
    path('police/', police_dashboard),
    path('hospital/', hospital_dashboard),
    path('admin-dashboard/', admin_dashboard),
    path('resolve/<int:alert_id>/', resolve_alert),
    path('update-location/', update_location),

    # APIs for React
    path('police-alerts/', police_alerts_api),
    path('hospital-alerts/', hospital_alerts_api),
    path('admin-alerts/', admin_alerts_api),
    path('resolve-api/<int:alert_id>/', resolve_alert_api),
    # Send alert
    path('send-alert/', send_alert),
    path('login/', login_api),
]