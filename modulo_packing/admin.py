"""
Admin para el Módulo de Packing.
"""

from django.contrib import admin
from .models import Empresa, TipoFruta, PackingSemanal, PackingTipo, PackingDetalle


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    """Admin para Empresa."""
    
    list_display = ['id', 'nombre', 'activo', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['nombre']
    ordering = ['nombre']


@admin.register(TipoFruta)
class TipoFrutaAdmin(admin.ModelAdmin):
    """Admin para TipoFruta."""
    
    list_display = ['id', 'nombre', 'activo', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['nombre']
    ordering = ['nombre']


class PackingDetalleInline(admin.TabularInline):
    """Inline para detalles diarios dentro de un tipo."""
    
    model = PackingDetalle
    extra = 0
    fields = ['dia', 'fecha', 'py']
    readonly_fields = []
    can_delete = True


@admin.register(PackingTipo)
class PackingTipoAdmin(admin.ModelAdmin):
    """Admin para PackingTipo."""
    
    list_display = ['id', 'packing_semanal', 'tipo_fruta', 'kg_total', 'estado']
    list_filter = ['estado', 'tipo_fruta', 'packing_semanal__empresa']
    search_fields = ['tipo_fruta__nombre', 'packing_semanal__empresa__nombre']
    inlines = [PackingDetalleInline]
    ordering = ['-packing_semanal__fecha_inicio_semana', 'tipo_fruta__nombre']


class PackingTipoInline(admin.TabularInline):
    """Inline para tipos de fruta dentro de un packing semanal."""
    
    model = PackingTipo
    extra = 0
    fields = ['tipo_fruta', 'kg_total', 'estado']
    readonly_fields = ['kg_total']
    can_delete = True
    show_change_link = True  # Permitir ir al detalle del tipo


@admin.register(PackingSemanal)
class PackingSemanalAdmin(admin.ModelAdmin):
    """Admin para PackingSemanal."""
    
    list_display = [
        'id', 
        'empresa', 
        'fecha_inicio_semana', 
        'fecha_fin_semana', 
        'kg_total', 
        'cantidad_tipos',
        'estado', 
        'fecha_registro'
    ]
    list_filter = ['estado', 'empresa', 'fecha_inicio_semana']
    search_fields = ['empresa__nombre', 'observaciones']
    date_hierarchy = 'fecha_inicio_semana'
    inlines = [PackingTipoInline]
    readonly_fields = ['kg_total', 'fecha_registro', 'fecha_actualizacion']
    ordering = ['-fecha_inicio_semana', 'empresa__nombre']
    
    fieldsets = (
        ('Información Principal', {
            'fields': ('empresa', 'fecha_inicio_semana', 'fecha_fin_semana', 'estado')
        }),
        ('Totales', {
            'fields': ('kg_total',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
        ('Fechas de Registro', {
            'fields': ('fecha_registro', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    def cantidad_tipos(self, obj):
        """Mostrar cantidad de tipos de fruta."""
        return obj.tipos.count()
    cantidad_tipos.short_description = 'Tipos'


@admin.register(PackingDetalle)
class PackingDetalleAdmin(admin.ModelAdmin):
    """Admin para PackingDetalle (acceso directo)."""
    
    list_display = ['id', 'get_empresa', 'get_tipo_fruta', 'dia', 'fecha', 'py']
    list_filter = ['dia', 'packing_tipo__tipo_fruta', 'packing_tipo__packing_semanal__empresa']
    search_fields = [
        'packing_tipo__tipo_fruta__nombre', 
        'packing_tipo__packing_semanal__empresa__nombre',
        'py'
    ]
    ordering = ['-fecha', 'packing_tipo__tipo_fruta__nombre']
    
    def get_empresa(self, obj):
        """Obtener nombre de empresa."""
        return obj.packing_tipo.packing_semanal.empresa.nombre
    get_empresa.short_description = 'Empresa'
    get_empresa.admin_order_field = 'packing_tipo__packing_semanal__empresa__nombre'
    
    def get_tipo_fruta(self, obj):
        """Obtener nombre del tipo de fruta."""
        return obj.packing_tipo.tipo_fruta.nombre
    get_tipo_fruta.short_description = 'Tipo Fruta'
    get_tipo_fruta.admin_order_field = 'packing_tipo__tipo_fruta__nombre'

