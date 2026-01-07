"""
Serializers para el Módulo de Packing.

Este módulo contiene los serializers que convierten los modelos
a formato JSON y viceversa para la API REST.
"""

from rest_framework import serializers
from .models import Empresa, TipoFruta, Packing, PackingDetalle


class EmpresaSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Empresa.
    
    Permite crear, listar y actualizar empresas.
    """
    
    class Meta:
        model = Empresa
        fields = ['id', 'nombre', 'activo', 'fecha_creacion']
        read_only_fields = ['id', 'fecha_creacion']


class TipoFrutaSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo TipoFruta.
    
    Permite crear, listar y actualizar tipos de fruta.
    """
    
    class Meta:
        model = TipoFruta
        fields = ['id', 'nombre', 'activo', 'fecha_creacion']
        read_only_fields = ['id', 'fecha_creacion']


class PackingDetalleSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo PackingDetalle.
    
    Representa un día específico dentro de la proyección semanal.
    """
    
    dia_display = serializers.CharField(source='get_dia_display', read_only=True)
    
    class Meta:
        model = PackingDetalle
        fields = [
            'id',
            'packing',
            'dia',
            'dia_display',
            'fecha',
            'py',
            'kg',
            'fecha_creacion',
        ]
        read_only_fields = ['id', 'fecha_creacion']


class PackingDetalleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para crear detalles de packing.
    
    No requiere el campo packing ya que se asigna automáticamente.
    """
    
    class Meta:
        model = PackingDetalle
        fields = ['id', 'dia', 'fecha', 'py', 'kg']
        read_only_fields = ['id']


class PackingSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Packing (cabecera).
    
    Incluye información de la empresa y tipo de fruta.
    """
    
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    tipo_fruta_nombre = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    detalles = PackingDetalleSerializer(many=True, read_only=True)
    
    class Meta:
        model = Packing
        fields = [
            'id',
            'empresa',
            'empresa_nombre',
            'tipo_fruta',
            'tipo_fruta_nombre',
            'fecha_proyeccion',
            'kg_total',
            'observaciones',
            'detalles',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'kg_total', 'fecha_creacion', 'fecha_actualizacion']


class PackingListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar packings.
    
    No incluye los detalles para mejorar el rendimiento.
    """
    
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    tipo_fruta_nombre = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    cantidad_detalles = serializers.SerializerMethodField()
    
    class Meta:
        model = Packing
        fields = [
            'id',
            'empresa',
            'empresa_nombre',
            'tipo_fruta',
            'tipo_fruta_nombre',
            'fecha_proyeccion',
            'kg_total',
            'cantidad_detalles',
            'fecha_creacion',
        ]
    
    def get_cantidad_detalles(self, obj):
        """Retorna la cantidad de detalles del packing."""
        return obj.detalles.count()


class PackingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear un packing con sus detalles.
    
    Permite crear la cabecera y los detalles en una sola petición.
    """
    
    detalles = PackingDetalleCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Packing
        fields = [
            'id',
            'empresa',
            'tipo_fruta',
            'fecha_proyeccion',
            'observaciones',
            'detalles',
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        """
        Crea el packing y sus detalles en una transacción.
        """
        detalles_data = validated_data.pop('detalles', [])
        packing = Packing.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            PackingDetalle.objects.create(packing=packing, **detalle_data)
        
        return packing
    
    def update(self, instance, validated_data):
        """
        Actualiza el packing y opcionalmente reemplaza los detalles.
        """
        detalles_data = validated_data.pop('detalles', None)
        
        # Actualizar campos del packing
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Si se enviaron detalles, reemplazar todos
        if detalles_data is not None:
            instance.detalles.all().delete()
            for detalle_data in detalles_data:
                PackingDetalle.objects.create(packing=instance, **detalle_data)
        
        return instance
