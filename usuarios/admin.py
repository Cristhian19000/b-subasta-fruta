"""
Configuración del Panel de Administración para Usuarios.
"""

from django.contrib import admin
from .models import PerfilUsuario


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    """Configuración del admin para perfiles de usuario."""
    
    list_display = ['user', 'es_administrador', 'telefono', 'fecha_creacion']
    list_filter = ['es_administrador']
    search_fields = ['user__username', 'user__email', 'telefono']
