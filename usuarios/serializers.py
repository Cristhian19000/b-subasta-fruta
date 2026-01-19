"""
Serializers para la API de Usuarios.

Este módulo contiene los serializers para autenticación,
registro y gestión de usuarios del sistema.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PerfilUsuario


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """Serializer para el perfil de usuario."""
    
    class Meta:
        model = PerfilUsuario
        fields = ['es_administrador', 'telefono', 'fecha_creacion']
        read_only_fields = ['fecha_creacion']


class UsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo User de Django.
    
    Incluye el perfil del usuario con su rol (administrador/trabajador).
    """
    
    perfil = PerfilUsuarioSerializer(read_only=True)
    es_administrador = serializers.BooleanField(write_only=True, required=False, default=False)
    telefono = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'is_active',
            'perfil',
            'es_administrador',
            'telefono',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        """Crear usuario con su perfil asociado."""
        # Extraer datos del perfil
        es_administrador = validated_data.pop('es_administrador', False)
        telefono = validated_data.pop('telefono', '')
        password = validated_data.pop('password')
        
        # Crear usuario
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Crear perfil asociado
        PerfilUsuario.objects.create(
            user=user,
            es_administrador=es_administrador,
            telefono=telefono
        )
        
        return user
    
    def update(self, instance, validated_data):
        """Actualizar usuario y su perfil."""
        # Extraer datos del perfil
        es_administrador = validated_data.pop('es_administrador', None)
        telefono = validated_data.pop('telefono', None)
        password = validated_data.pop('password', None)
        
        # Actualizar usuario
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        
        # Actualizar perfil si existe
        if hasattr(instance, 'perfil'):
            if es_administrador is not None:
                instance.perfil.es_administrador = es_administrador
            if telefono is not None:
                instance.perfil.telefono = telefono
            instance.perfil.save()
        
        return instance


class UsuarioListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar usuarios."""
    
    es_administrador = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'es_administrador',
        ]
    
    def get_es_administrador(self, obj):
        """Obtener si el usuario es administrador desde su perfil."""
        if hasattr(obj, 'perfil'):
            return obj.perfil.es_administrador
        return False


class LoginSerializer(serializers.Serializer):
    """Serializer para el login de usuarios."""
    
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class UsuarioInfoSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener información del usuario autenticado.
    
    Incluye todos los datos necesarios para el frontend.
    """
    
    es_administrador = serializers.SerializerMethodField()
    telefono = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_superuser',
            'es_administrador',
            'telefono',
        ]
    
    def get_es_administrador(self, obj):
        """El superusuario siempre es administrador."""
        if obj.is_superuser:
            return True
        if hasattr(obj, 'perfil'):
            return obj.perfil.es_administrador
        return False
    
    def get_telefono(self, obj):
        """Obtener teléfono del perfil."""
        if hasattr(obj, 'perfil'):
            return obj.perfil.telefono
        return None
