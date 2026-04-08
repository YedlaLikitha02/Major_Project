from django.db import models

class Alert(models.Model):
    device_id = models.CharField(max_length=100)
    latitude = models.FloatField()
    longitude = models.FloatField()
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default="active")
    route_info = models.TextField(blank=True, null=True)
    emergency_type = models.CharField(max_length=50, default="general")
    severity = models.CharField(default="medium", max_length=20)
    resolved_at = models.DateTimeField(null=True, blank=True)
    proof_image = models.ImageField(upload_to="proofs/", null=True, blank=True)


    def __str__(self):
        return f"{self.device_id} - {self.status}"


