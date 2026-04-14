from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication

from django.shortcuts import render, redirect, get_object_or_404
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


# ================= SEND ALERT API (UPDATED WITH MODE LOGIC) =================
@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def send_alert(request):

    print("📥 DATA RECEIVED:", request.data)   # DEBUG

    serializer = AlertSerializer(data=request.data)

    if serializer.is_valid():
        alert = serializer.save()

        emergency = (alert.emergency_type or "general").lower()

        # 🔥 NEW: MODE FROM FLUTTER (single / double tap)
        mode = request.data.get("mode", "single")  # default single tap

        # ================= EXISTING SMART ROUTING (UNCHANGED) =================
        if emergency == "medical":
            alert.route_info = "Hospital and ambulance notified"

        elif emergency in ["attack", "robbery"]:
            alert.route_info = "Police notified"

        elif emergency == "accident":
            alert.route_info = "Police and ambulance notified"

        else:
            alert.route_info = "General SOS - all responders notified"

        # ================= 🔥 NEW SOS LOGIC (ADDED) =================
        # SINGLE TAP → Police + Dashboard (default behavior)
        if mode == "single":
            alert.route_info += " | Mode: SINGLE (Police + Dashboard)"

        # DOUBLE TAP → Police + Admin + Hospital + Dashboard
        elif mode == "double":
            alert.route_info += " | Mode: DOUBLE (ALL AGENCIES)"

        alert.save()

        return Response({
            "status": "success",
            "message": "Alert received",
            "data": {
                "device_id": alert.device_id,
                "latitude": alert.latitude,
                "longitude": alert.longitude,
                "emergency_type": alert.emergency_type,
                "route_info": alert.route_info,
                "mode": mode
            }
        })

    else:
        print("❌ SERIALIZER ERRORS:", serializer.errors)
        return Response({
            "status": "error",
            "errors": serializer.errors
        }, status=400)


# ================= POLICE DASHBOARD =================
@login_required
def police_dashboard(request):
    alerts = Alert.objects.filter(
        emergency_type__in=["attack", "robbery", "accident"]
    ).order_by("-timestamp")

    return render(request, "police_dashboard.html", {"alerts": alerts})


# ================= HOSPITAL DASHBOARD =================
@login_required
def hospital_dashboard(request):
    alerts = Alert.objects.filter(
        emergency_type__in=["medical", "accident"]
    ).order_by("-timestamp")

    return render(request, "hospital_dashboard.html", {"alerts": alerts})


# ================= ADMIN DASHBOARD =================
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

    user = request.user
    groups = [g.name.lower() for g in user.groups.all()]

    if "police" in groups:
        return redirect('/api/police/')
    elif "hospital" in groups:
        return redirect('/api/hospital/')
    else:
        return redirect('/api/admin-dashboard/')


# ================= HOME =================
def home(request):
    return render(request, "home.html")


# ================= APIs =================
@api_view(['GET'])
def police_alerts_api(request):
    alerts = Alert.objects.filter(
        emergency_type__in=["attack", "robbery", "accident"]
    ).order_by("-timestamp")

    serializer = AlertSerializer(alerts, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def hospital_alerts_api(request):
    alerts = Alert.objects.filter(
        emergency_type__in=["medical", "accident"]
    ).order_by("-timestamp")

    serializer = AlertSerializer(alerts, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def admin_alerts_api(request):
    alerts = Alert.objects.all().order_by("-timestamp")
    serializer = AlertSerializer(alerts, many=True)
    return Response(serializer.data)


# ================= LOGIN API =================
@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def login_api(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user:
        login(request, user)

        groups = [g.name.lower() for g in user.groups.all()]

        if "police" in groups:
            role = "police"
        elif "hospital" in groups:
            role = "hospital"
        else:
            role = "admin"

        return Response({"status": "success", "role": role})

    return Response({"status": "error", "message": "Invalid credentials"})


# ================= RESOLVE ALERT API =================
@api_view(['POST'])
def resolve_alert_api(request, alert_id):
    try:
        alert = Alert.objects.get(id=alert_id)

        photo = request.FILES.get("photo")

        user_lat = float(request.POST.get("lat"))
        user_lng = float(request.POST.get("lng"))

        alert_lat = float(request.POST.get("alert_lat"))
        alert_lng = float(request.POST.get("alert_lng"))

        distance = geodesic(
            (user_lat, user_lng),
            (alert_lat, alert_lng)
        ).meters

        if distance > 200:
            return Response({
                "status": "error",
                "message": f"Too far ({int(distance)} meters)"
            }, status=400)

        alert.status = "resolved"

        if photo:
            alert.proof_image = photo

        alert.save()

        return Response({
            "status": "success",
            "distance": distance
        })

    except Alert.DoesNotExist:
        return Response({"status": "error"}, status=404)

    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)


# ================= LIVE LOCATION =================
user_locations = {}

@api_view(['POST'])
def update_location(request):
    user = request.user.username if request.user.is_authenticated else "anonymous"

    lat = request.data.get("lat")
    lng = request.data.get("lng")

    user_locations[user] = {
        "lat": lat,
        "lng": lng
    }

    print("📍 LIVE LOCATION:", user, lat, lng)

    return Response({"status": "updated"})
