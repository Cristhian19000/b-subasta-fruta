"""
Serializers para el Módulo de Packing.

Estructura jerárquica:
- PackingSemanal (cabecera principal)
  - PackingTipo (por tipo de fruta)
    - PackingDetalle (por día)
"""

from rest_framework import serializers
from django.db import transaction
from .models import Empresa, TipoFruta, PackingSemanal, PackingTipo, PackingDetalle


# =============================================================================
# SERIALIZERS BÁSICOS
# =============================================================================

class EmpresaSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Empresa."""
    
    class Meta:
        model = Empresa
        fields = ['id', 'nombre', 'activo', 'fecha_creacion']
        read_only_fields = ['id', 'fecha_creacion']


class TipoFrutaSerializer(serializers.ModelSerializer):
    """Serializer para el modelo TipoFruta."""
    
    class Meta:
        model = TipoFruta
        fields = ['id', 'nombre', 'activo', 'fecha_creacion']
        read_only_fields = ['id', 'fecha_creacion']


# =============================================================================
# SERIALIZERS DE DETALLE (para lectura)
# =============================================================================

class PackingDetalleSerializer(serializers.ModelSerializer):
    """Serializer para el detalle diario."""
    
    dia_display = serializers.CharField(source='get_dia_display', read_only=True)
    
    class Meta:
        model = PackingDetalle
        fields = ['id', 'dia', 'dia_display', 'fecha', 'py']
        read_only_fields = ['id']


class PackingTipoSerializer(serializers.ModelSerializer):
    """Serializer para el tipo de fruta dentro de un packing."""
    
    tipo_fruta_nombre = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    detalles = PackingDetalleSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = PackingTipo
        fields = ['id', 'tipo_fruta', 'tipo_fruta_nombre', 'kg_total', 'estado', 'estado_display', 'detalles']
        read_only_fields = ['id', 'kg_total']


# =============================================================================
# SERIALIZERS PARA LISTADO
# =============================================================================

class PackingSemanalListSerializer(serializers.ModelSerializer):
    """Serializer para listar packings semanales (vista resumida)."""
    
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    cantidad_tipos = serializers.IntegerField(source='num_tipos', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = PackingSemanal
        fields = [
            'id', 
            'empresa', 
            'empresa_nombre', 
            'fecha_inicio_semana',
            'fecha_fin_semana',
            'total_kg', 
            'cantidad_tipos',
            'estado',
            'estado_display',
            'fecha_registro',
        ]
        read_only_fields = ['id', 'total_kg', 'cantidad_tipos', 'fecha_registro']
    
    # Mapear kg_total a total_kg para el frontend
    total_kg = serializers.DecimalField(source='kg_total', max_digits=12, decimal_places=2, read_only=True)


# =============================================================================
# SERIALIZERS PARA DETALLE
# =============================================================================

class PackingSemanalDetailSerializer(serializers.ModelSerializer):
    """Serializer para ver un packing semanal con todos sus detalles."""
    
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    tipos = PackingTipoSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    total_kg = serializers.DecimalField(source='kg_total', max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = PackingSemanal
        fields = [
            'id',
            'empresa',
            'empresa_nombre',
            'fecha_inicio_semana',
            'fecha_fin_semana',
            'total_kg',
            'estado',
            'estado_display',
            'observaciones',
            'tipos',
            'fecha_registro',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'total_kg', 'fecha_registro', 'fecha_actualizacion']


# =============================================================================
# SERIALIZERS PARA CREAR/ACTUALIZAR
# =============================================================================

class PackingDetalleCreateSerializer(serializers.Serializer):
    """Serializer para crear detalles diarios."""
    dia = serializers.ChoiceField(choices=PackingDetalle.DIA_CHOICES)
    fecha = serializers.DateField()
    py = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)


class PackingTipoCreateSerializer(serializers.Serializer):
    """Serializer para crear tipos de fruta con sus detalles."""
    tipo_fruta = serializers.PrimaryKeyRelatedField(queryset=TipoFruta.objects.all())
    detalles = PackingDetalleCreateSerializer(many=True)


class PackingSemanalCreateSerializer(serializers.Serializer):
    """
    Serializer para crear un packing semanal completo.
    
    Recibe: empresa, fecha_inicio_semana, fecha_fin_semana, observaciones (opcional),
    estado (opcional) y un array de tipos con sus detalles diarios.
    """
    empresa = serializers.PrimaryKeyRelatedField(queryset=Empresa.objects.all())
    fecha_inicio_semana = serializers.DateField()
    fecha_fin_semana = serializers.DateField()
    observaciones = serializers.CharField(required=False, allow_blank=True, default='')
    estado = serializers.ChoiceField(choices=PackingSemanal.ESTADO_CHOICES, default='PROYECTADO')
    tipos = PackingTipoCreateSerializer(many=True)
    
    def validate(self, data):
        """Validar fechas y unicidad."""
        fecha_inicio = data['fecha_inicio_semana']
        fecha_fin = data['fecha_fin_semana']
        empresa = data['empresa']
        
        # Validar que fecha_fin sea mayor que fecha_inicio
        if fecha_fin <= fecha_inicio:
            raise serializers.ValidationError({
                'fecha_fin_semana': 'La fecha de fin debe ser posterior a la fecha de inicio'
            })
        
        # Validar unicidad (empresa + fecha_inicio)
        instance = getattr(self, 'instance', None)
        queryset = PackingSemanal.objects.filter(empresa=empresa, fecha_inicio_semana=fecha_inicio)
        
        if instance:
            queryset = queryset.exclude(pk=instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError({
                'fecha_inicio_semana': f'Ya existe un packing para {empresa.nombre} en la semana del {fecha_inicio}'
            })
        
        return data
    
    def create(self, validated_data):
        """Crear el packing semanal con todos sus tipos y detalles."""
        tipos_data = validated_data.pop('tipos')
        
        # Crear el packing semanal
        packing_semanal = PackingSemanal.objects.create(**validated_data)
        
        # Crear cada tipo de fruta con sus detalles
        for tipo_data in tipos_data:
            detalles_data = tipo_data.pop('detalles')
            packing_tipo = PackingTipo.objects.create(
                packing_semanal=packing_semanal,
                tipo_fruta=tipo_data['tipo_fruta']
            )
            
            # Crear los detalles diarios
            for detalle_data in detalles_data:
                PackingDetalle.objects.create(
                    packing_tipo=packing_tipo,
                    **detalle_data
                )
            
            # Actualizar total del tipo
            packing_tipo.actualizar_kg_total()
        
        return packing_semanal
    
    def update(self, instance, validated_data):
        """Actualizar el packing semanal reemplazando tipos y detalles."""
        tipos_data = validated_data.pop('tipos')
        
        with transaction.atomic(): # Si algo falla, no se borra nada
            # Actualizar cabecera
            instance.empresa = validated_data.get('empresa', instance.empresa)
            instance.fecha_inicio_semana = validated_data.get('fecha_inicio_semana', instance.fecha_inicio_semana)
            instance.fecha_fin_semana = validated_data.get('fecha_fin_semana', instance.fecha_fin_semana)
            instance.observaciones = validated_data.get('observaciones', instance.observaciones)
            instance.estado = validated_data.get('estado', instance.estado)
            instance.save()
            
            # Eliminar y recrear
            instance.tipos.all().delete()
            
            for tipo_data in tipos_data:
                detalles_data = tipo_data.pop('detalles')
                packing_tipo = PackingTipo.objects.create(
                    packing_semanal=instance,
                    tipo_fruta=tipo_data['tipo_fruta']
                )
                
                for detalle_data in detalles_data:
                    # detalle_data ahora solo contiene 'dia', 'fecha' y 'py'
                    PackingDetalle.objects.create(
                        packing_tipo=packing_tipo,
                        **detalle_data
                    )
                
                packing_tipo.actualizar_kg_total()
                
        return instance