from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.utils import timezone

from .models import Alert
from .serializers import AlertSerializer
from geopy.distance import geodesic


# ================= DISABLE CSRF =================
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return


# ================= SEND ALERT API =================
@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def send_alert(request):

    print("📥 DATA RECEIVED:", request.data)

    serializer = AlertSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            "status": "error",
            "errors": serializer.errors
        }, status=400)

    alert = serializer.save()

    # ================= MODE LOGIC =================
    mode = request.data.get("mode", "single")  # single / double

    # default roles safety
    roles = request.data.get("notify_roles")

    # If frontend does NOT send roles → use mode logic
    if not roles:

        if mode == "single":
            roles = ["police", "admin", "dashboard"]

        elif mode == "double":
            roles = ["police", "hospital", "admin", "dashboard"]

        else:
            roles = ["police", "admin", "dashboard"]

    # ================= ROUTING =================
    if "police" in roles:
        send_to_police(alert)

    if "hospital" in roles:
        send_to_hospital(alert)

    if "admin" in roles:
        send_to_admin(alert)

    if "dashboard" in roles:
        send_to_dashboard(alert)

    alert.route_info = f"MODE: {mode} | ROLES: {roles}"
    alert.save()

    return Response({
        "status": "success",
        "message": "Alert received",
        "data": {
            "device_id": alert.device_id,
            "latitude": alert.latitude,
            "longitude": alert.longitude,
            "mode": mode,
            "roles_sent": roles,
            "route_info": alert.route_info
        }
    })


# ================= PLACEHOLDER FUNCTIONS =================
# (Replace these with real Firebase/email/SMS integrations later)

def send_to_police(alert):
    print("📢 Sent to POLICE dashboard")


def send_to_hospital(alert):
    print("🏥 Sent to HOSPITAL dashboard")


def send_to_admin(alert):
    print("👮 Sent to ADMIN dashboard")


def send_to_dashboard(alert):
    print("📊 Sent to MAIN dashboard")


# ================= DASHBOARDS =================
@login_required
def police_dashboard(request):
    alerts = Alert.objects.filter(
        emergency_type__in=["attack", "robbery", "accident"]
    ).order_by("-timestamp")

    return render(request, "police_dashboard.html", {"alerts": alerts})


@login_required
def hospital_dashboard(request):
    alerts = Alert.objects.filter(
        emergency_type__in=["medical", "accident"]
    ).order_by("-timestamp")

    return render(request, "hospital_dashboard.html", {"alerts": alerts})


@login_required
def admin_dashboard(request):
    alerts = Alert.objects.all().order_by("-timestamp")
    return render(request, "admin_dashboard.html", {"alerts": alerts})


# ================= RESOLVE ALERT =================
@login_required
def resolve_alert(request, alert_id):
    alert = get_object_or_404(Alert, id=alert_id)
    alert.status = "resolved"
    alert.resolved_at = timezone.now()
    alert.save()
    return Response({"status": "resolved"})


# ================= LOGIN =================
@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def login_api(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user:
        login(request, user)
        return Response({"status": "success"})

    return Response({"status": "error", "message": "Invalid credentials"})
