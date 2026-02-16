"""
Modelos de Usuario y Permisos para el sistema de subastas.

Incluye el modelo de PerfilPermiso para gestionar permisos granulares
y el PerfilUsuario para extender el usuario de Django.
"""

from django.db import models
from django.contrib.auth.models import User


class PerfilPermiso(models.Model):
    """
    Perfiles de permisos personalizados con control granular por módulo.
    
    Los permisos se almacenan en formato JSON para máxima flexibilidad.
    Estructura de permisos:
    {
        'dashboard': ['view_dashboard', 'view_kpis'],
        'clientes': ['view_list', 'view_detail', 'create', 'update', 'delete'],
        'packing': ['view_list', 'create', 'update'],
        ...
    }
    """
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Nombre del Perfil'
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descripción'
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )
    
    es_superusuario = models.BooleanField(
        default=False,
        verbose_name='Es Superusuario',
        help_text='Un superusuario tiene acceso total a todo el sistema'
    )
    
    # Almacenar permisos como JSON
    permisos = models.JSONField(
        default=dict,
        verbose_name='Permisos',
        help_text='Estructura: {"modulo": ["permiso1", "permiso2"]}'
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Fecha de Actualización'
    )
    
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='perfiles_creados',
        verbose_name='Creado por'
    )
    
    class Meta:
        verbose_name = 'Perfil de Permiso'
        verbose_name_plural = 'Perfiles de Permisos'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class PerfilUsuario(models.Model):
    """
    Perfil extendido para usuarios del sistema.
    
    Atributos:
        - user: Relación con el modelo User de Django
        - dni: Documento Nacional de Identidad
        - perfil_permiso: Perfil de permisos asignado
        - fecha_creacion: Fecha de creación del perfil
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil',
        verbose_name='Usuario'
    )
    
    # DNI del usuario
    dni = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='DNI'
    )
    
    # Perfil de permisos asignado
    perfil_permiso = models.ForeignKey(
        PerfilPermiso,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usuarios',
        verbose_name='Perfil de Permisos'
    )
    
    # Fecha de creación del perfil
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    @property
    def es_admin(self):
        """Verifica si el usuario tiene acceso total vía perfil de permisos."""
        if self.perfil_permiso and self.perfil_permiso.es_superusuario:
            return True
        return False
    
    class Meta:
        verbose_name = 'Perfil de Usuario'
        verbose_name_plural = 'Perfiles de Usuario'
    
    def __str__(self):
        perfil_nombre = self.perfil_permiso.nombre if self.perfil_permiso else 'Sin perfil'
        return f"{self.user.username} - {perfil_nombre}"
