from rest_framework import serializers
from .models import Alert

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'
        extra_kwargs = {
            'proof_image': {'required': False},
            'route_info': {'required': False},
            'resolved_at': {'required': False}
        }