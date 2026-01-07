"""
Modelo de Perfil de Usuario para el sistema de subastas.

Extiende el modelo de usuario de Django con campos adicionales
para identificar el rol del usuario (administrador o trabajador).
"""

from django.db import models
from django.contrib.auth.models import User


class PerfilUsuario(models.Model):
    """
    Perfil extendido para usuarios del sistema.
    
    Atributos:
        - user: Relación con el modelo User de Django
        - es_administrador: Indica si el usuario es administrador
        - telefono: Número de teléfono del usuario
        - fecha_creacion: Fecha de creación del perfil
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil',
        verbose_name='Usuario'
    )
    
    # Indica si el usuario tiene permisos de administrador
    es_administrador = models.BooleanField(
        default=False,
        verbose_name='Es Administrador'
    )
    
    # Teléfono de contacto del usuario
    telefono = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Teléfono'
    )
    
    # Fecha de creación del perfil
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    class Meta:
        verbose_name = 'Perfil de Usuario'
        verbose_name_plural = 'Perfiles de Usuario'
    
    def __str__(self):
        rol = 'Administrador' if self.es_administrador else 'Trabajador'
        return f"{self.user.username} - {rol}"
