"""
Serializers para la API de Usuarios.

Este módulo contiene los serializers para autenticación,
registro y gestión de usuarios del sistema.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PerfilUsuario, PerfilPermiso


class PerfilPermisoSerializer(serializers.ModelSerializer):
    """Serializer para perfiles de permisos."""
    
    total_usuarios = serializers.SerializerMethodField()
    nombre_creador = serializers.SerializerMethodField()
    
    class Meta:
        model = PerfilPermiso
        fields = [
            'id',
            'nombre',
            'descripcion',
            'activo',
            'es_superusuario',
            'permisos',
            'total_usuarios',
            'nombre_creador',
            'fecha_creacion',
            'fecha_actualizacion'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion', 'total_usuarios', 'nombre_creador']
    
    def get_total_usuarios(self, obj):
        """Contar usuarios activos con este perfil."""
        return obj.usuarios.filter(user__is_active=True).count()
    
    def get_nombre_creador(self, obj):
        """Obtener nombre del usuario que creó este perfil."""
        if obj.creado_por:
            return f"{obj.creado_por.first_name} {obj.creado_por.last_name}".strip() or obj.creado_por.username
        return None


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """Serializer para el perfil de usuario."""
    
    perfil_permiso = serializers.SerializerMethodField()
    
    class Meta:
        model = PerfilUsuario
        fields = ['dni', 'fecha_creacion', 'perfil_permiso']
        read_only_fields = ['fecha_creacion']
    
    def get_perfil_permiso(self, obj):
        """Retornar información básica del perfil de permisos asignado."""
        if obj.perfil_permiso:
            return {
                'id': obj.perfil_permiso.id,
                'nombre': obj.perfil_permiso.nombre,
                'es_superusuario': obj.perfil_permiso.es_superusuario
            }
        return None


class UsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo User de Django.
    
    Incluye el perfil del usuario con su perfil de permisos.
    """
    
    perfil = PerfilUsuarioSerializer(read_only=True)
    dni = serializers.CharField(write_only=True, required=False, allow_blank=True)
    perfil_permiso_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'password',
            'is_active',
            'perfil',
            'dni',
            'perfil_permiso_id',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def validate_username(self, value):
        """
        Validar que el username no contenga espacios.
        Los usernames de Django no permiten espacios, pero el mensaje por defecto no es claro.
        """
        if ' ' in value:
            raise serializers.ValidationError(
                "El nombre de usuario no puede contener espacios. Use un solo nombre sin espacios (ej: 'jperez' en lugar de 'juan perez')."
            )
        
        # Validación adicional: solo letras, números y caracteres especiales permitidos
        import re
        if not re.match(r'^[\w.@+-]+$', value):
            raise serializers.ValidationError(
                "El nombre de usuario solo puede contener letras, números y los caracteres: @ . + - _"
            )
        
        return value
    
    def create(self, validated_data):
        """Crear usuario con su perfil asociado."""
        # Extraer datos del perfil
        dni = validated_data.pop('dni', '')
        perfil_permiso_id = validated_data.pop('perfil_permiso_id', None)
        password = validated_data.pop('password')
        
        # Crear usuario
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Obtener el PerfilPermiso si se proporcionó
        perfil_permiso = None
        if perfil_permiso_id:
            try:
                perfil_permiso = PerfilPermiso.objects.get(id=perfil_permiso_id)
            except PerfilPermiso.DoesNotExist:
                pass
        
        # Crear perfil asociado
        PerfilUsuario.objects.create(
            user=user,
            dni=dni,
            perfil_permiso=perfil_permiso
        )
        
        return user
    
    def update(self, instance, validated_data):
        """Actualizar usuario y su perfil."""
        # Extraer datos del perfil
        dni = validated_data.pop('dni', None)
        perfil_permiso_id = validated_data.pop('perfil_permiso_id', None)
        password = validated_data.pop('password', None)
        
        # Actualizar usuario
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        
        # Actualizar perfil si existe
        if hasattr(instance, 'perfil'):
            if dni is not None:
                instance.perfil.dni = dni
            
            # Actualizar perfil_permiso
            if perfil_permiso_id is not None:
                if perfil_permiso_id == '' or perfil_permiso_id == 0:
                    instance.perfil.perfil_permiso = None
                else:
                    try:
                        perfil_permiso = PerfilPermiso.objects.get(id=perfil_permiso_id)
                        instance.perfil.perfil_permiso = perfil_permiso
                    except PerfilPermiso.DoesNotExist:
                        pass
            
            instance.perfil.save()
        
        return instance


class UsuarioListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar usuarios."""
    
    dni = serializers.SerializerMethodField()
    perfil_permiso = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'dni',
            'is_active',
            'perfil_permiso',
        ]
    
    def get_dni(self, obj):
        """Obtener DNI del perfil."""
        if hasattr(obj, 'perfil'):
            return obj.perfil.dni
        return None
    
    def get_perfil_permiso(self, obj):
        """Obtener información del perfil de permisos asignado."""
        if hasattr(obj, 'perfil') and obj.perfil.perfil_permiso:
            return {
                'id': obj.perfil.perfil_permiso.id,
                'nombre': obj.perfil.perfil_permiso.nombre,
                'es_superusuario': obj.perfil.perfil_permiso.es_superusuario
            }
        return None


class LoginSerializer(serializers.Serializer):
    """Serializer para el login de usuarios."""
    
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class UsuarioInfoSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener información del usuario autenticado.
    
    Incluye todos los datos necesarios para el frontend.
    """
    
    dni = serializers.SerializerMethodField()
    perfil_permiso = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'is_superuser',
            'dni',
            'perfil_permiso',
        ]
    
    def get_dni(self, obj):
        """Obtener DNI del perfil."""
        if hasattr(obj, 'perfil'):
            return obj.perfil.dni
        return None
    
    def get_perfil_permiso(self, obj):
        """Obtener información del perfil de permisos asignado."""
        if hasattr(obj, 'perfil') and obj.perfil.perfil_permiso:
            return {
                'id': obj.perfil.perfil_permiso.id,
                'nombre': obj.perfil.perfil_permiso.nombre,
                'permisos': obj.perfil.perfil_permiso.permisos,
                'es_superusuario': obj.perfil.perfil_permiso.es_superusuario
            }
        return None
