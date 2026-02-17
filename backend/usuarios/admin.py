"""
Configuración del Panel de Administración para Usuarios.
"""

from django.contrib import admin
from .models import PerfilUsuario


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    """Configuración del admin para perfiles de usuario."""
    
    list_display = ['user', 'perfil_permiso', 'dni', 'fecha_creacion']
    list_filter = ['perfil_permiso']
    search_fields = ['user__username', 'dni']
