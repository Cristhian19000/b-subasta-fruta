"""
Configuración del Admin para el Módulo de Packing.

Este módulo configura cómo se muestran los modelos en el panel
de administración de Django.
"""

from django.contrib import admin
from .models import Empresa, TipoFruta, Packing, PackingDetalle


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    """
    Configuración del admin para Empresa.
    """
    list_display = ['id', 'nombre', 'activo', 'fecha_creacion']
    list_filter = ['activo']
    search_fields = ['nombre']
    ordering = ['nombre']


@admin.register(TipoFruta)
class TipoFrutaAdmin(admin.ModelAdmin):
    """
    Configuración del admin para TipoFruta.
    """
    list_display = ['id', 'nombre', 'activo', 'fecha_creacion']
    list_filter = ['activo']
    search_fields = ['nombre']
    ordering = ['nombre']


class PackingDetalleInline(admin.TabularInline):
    """
    Inline para mostrar los detalles dentro del packing.
    """
    model = PackingDetalle
    extra = 7  # Mostrar 7 filas vacías (una por día de la semana)
    fields = ['dia', 'fecha', 'py', 'kg']


@admin.register(Packing)
class PackingAdmin(admin.ModelAdmin):
    """
    Configuración del admin para Packing.
    """
    list_display = [
        'id',
        'empresa',
        'tipo_fruta',
        'fecha_proyeccion',
        'kg_total',
        'fecha_creacion',
    ]
    list_filter = ['empresa', 'tipo_fruta', 'fecha_proyeccion']
    search_fields = ['empresa__nombre', 'tipo_fruta__nombre']
    ordering = ['-fecha_proyeccion']
    inlines = [PackingDetalleInline]
    readonly_fields = ['kg_total', 'fecha_creacion', 'fecha_actualizacion']


@admin.register(PackingDetalle)
class PackingDetalleAdmin(admin.ModelAdmin):
    """
    Configuración del admin para PackingDetalle.
    """
    list_display = ['id', 'packing', 'dia', 'fecha', 'py', 'kg']
    list_filter = ['dia', 'packing__empresa', 'packing__tipo_fruta']
    search_fields = ['py', 'packing__empresa__nombre']
    ordering = ['fecha']

