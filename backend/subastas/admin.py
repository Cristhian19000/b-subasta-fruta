"""
Admin para el Módulo de Subastas.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Subasta, Oferta


class OfertaInline(admin.TabularInline):
    """Inline para ver ofertas dentro de una subasta."""
    model = Oferta
    extra = 0
    readonly_fields = ['cliente', 'monto', 'es_ganadora', 'fecha_oferta']
    can_delete = False
    ordering = ['-monto']


@admin.register(Subasta)
class SubastaAdmin(admin.ModelAdmin):
    """Admin para Subastas."""
    
    list_display = [
        'id',
        'get_empresa',
        'get_tipo_fruta',
        'get_fecha_produccion',
        'fecha_hora_inicio',
        'fecha_hora_fin',
        'precio_base',
        'get_precio_actual',
        'estado',
        'get_estado_badge',
        'get_total_ofertas',
    ]
    
    list_filter = ['estado', 'fecha_hora_inicio']
    search_fields = [
        'packing_detalle__packing_tipo__packing_semanal__empresa__nombre',
        'packing_detalle__packing_tipo__tipo_fruta__nombre',
    ]
    
    readonly_fields = [
        'fecha_creacion',
        'fecha_actualizacion',
        'get_precio_actual',
        'get_estado_badge',
    ]
    
    inlines = [OfertaInline]
    
    fieldsets = (
        ('Producción', {
            'fields': ('packing_detalle',)
        }),
        ('Configuración de Subasta', {
            'fields': ('fecha_hora_inicio', 'fecha_hora_fin', 'precio_base')
        }),
        ('Estado', {
            'fields': ('estado', 'get_estado_badge', 'get_precio_actual')
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    def get_empresa(self, obj):
        return obj.empresa.nombre
    get_empresa.short_description = 'Empresa'
    
    def get_tipo_fruta(self, obj):
        return obj.tipo_fruta.nombre
    get_tipo_fruta.short_description = 'Tipo de Fruta'
    
    def get_fecha_produccion(self, obj):
        return obj.packing_detalle.fecha
    get_fecha_produccion.short_description = 'Fecha Producción'
    
    def get_precio_actual(self, obj):
        return f"${obj.precio_actual:,.2f}"
    get_precio_actual.short_description = 'Precio Actual'
    
    def get_estado_badge(self, obj):
        estado = obj.estado_calculado
        colors = {
            'PROGRAMADA': '#3498db',
            'ACTIVA': '#27ae60',
            'FINALIZADA': '#95a5a6',
            'CANCELADA': '#e74c3c',
        }
        color = colors.get(estado, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px;">{}</span>',
            color,
            estado
        )
    get_estado_badge.short_description = 'Estado Actual'
    
    def get_total_ofertas(self, obj):
        return obj.ofertas.count()
    get_total_ofertas.short_description = 'Ofertas'


@admin.register(Oferta)
class OfertaAdmin(admin.ModelAdmin):
    """Admin para Ofertas."""
    
    list_display = [
        'id',
        'get_subasta_info',
        'cliente',
        'monto',
        'es_ganadora',
        'fecha_oferta',
    ]
    
    list_filter = ['es_ganadora', 'fecha_oferta']
    search_fields = ['cliente__nombre_razon_social', 'cliente__ruc_dni']
    
    readonly_fields = ['fecha_oferta', 'version']
    
    def get_subasta_info(self, obj):
        return f"Subasta #{obj.subasta.id}"
    get_subasta_info.short_description = 'Subasta'
