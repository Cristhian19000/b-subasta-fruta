"""
Configuración del Panel de Administración para Clientes.

Este módulo configura cómo se visualizan y gestionan los clientes
en el panel de administración de Django (/admin/).

Características:
    - Vista de lista con columnas principales
    - Filtros por tipo, estado, sede, etc.
    - Búsqueda por RUC/DNI, nombre y contactos
    - Formulario organizado en secciones colapsables
"""

from django.contrib import admin
from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    """
    Configuración del panel de administración para el modelo Cliente.
    
    Acceso: http://127.0.0.1:8000/admin/clientes/cliente/
    """
    
    # =========================================================================
    # CONFIGURACIÓN DE LA LISTA DE CLIENTES
    # =========================================================================
    
    # Columnas a mostrar en la lista de clientes
    list_display = [
        'ruc_dni',
        'nombre_razon_social',
        'tipo',
        'sede',
        'estado',
        'estatus_ficha',
        'confirmacion_correo',
        'fecha_creacion',
    ]
    
    # Filtros disponibles en la barra lateral derecha
    list_filter = [
        'tipo',
        'estado',
        'estatus_ficha',
        'confirmacion_correo',
        'sede',
    ]
    
    # Campos en los que se puede buscar (barra de búsqueda)
    search_fields = [
        'ruc_dni',
        'nombre_razon_social',
        'contacto_1',
        'contacto_2',
        'correo_electronico_1',
        'correo_electronico_2',
    ]
    
    # =========================================================================
    # CONFIGURACIÓN DEL FORMULARIO DE EDICIÓN
    # =========================================================================
    
    # Campos que no se pueden editar (solo visualización)
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    
    # Organización del formulario en secciones
    fieldsets = (
        # Sección 1: Datos de identificación del cliente
        ('Identificación', {
            'fields': ('ruc_dni', 'nombre_razon_social', 'tipo', 'sede', 'estado')
        }),
        # Sección 2: Información del contacto principal
        ('Contacto Principal', {
            'fields': ('contacto_1', 'cargo_1', 'numero_1', 'correo_electronico_1')
        }),
        # Sección 3: Contacto secundario (colapsable, opcional)
        ('Contacto Secundario', {
            'fields': ('contacto_2', 'cargo_2', 'numero_2', 'correo_electronico_2'),
            'classes': ('collapse',),  # Sección colapsable
        }),
        # Sección 4: Estados de control
        ('Estado de Ficha', {
            'fields': ('estatus_ficha', 'confirmacion_correo')
        }),
        # Sección 5: Información de auditoría (colapsable)
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',),  # Sección colapsable
        }),
    )
