"""
Serializers para el Módulo de Packing.

Estructura jerárquica:
- PackingSemanal (cabecera principal)
  - PackingTipo (por tipo de fruta)
    - PackingDetalle (por día)
  - PackingImagen (imágenes opcionales)
"""

from rest_framework import serializers
from django.db import transaction
from .models import Empresa, TipoFruta, PackingSemanal, PackingTipo, PackingDetalle, PackingImagen


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
# SERIALIZER PARA IMÁGENES
# =============================================================================

class PackingImagenSerializer(serializers.ModelSerializer):
    """Serializer para imágenes de packing."""
    
    imagen_url = serializers.SerializerMethodField()
    tipo_fruta_nombre = serializers.CharField(source='packing_tipo.tipo_fruta.nombre', read_only=True)
    
    class Meta:
        model = PackingImagen
        fields = ['id', 'packing_semanal', 'imagen', 'imagen_url', 'descripcion', 'packing_tipo', 'tipo_fruta_nombre', 'fecha_subida']
        read_only_fields = ['id', 'fecha_subida']
    
    def get_imagen_url(self, obj):
        """Obtener URL completa de la imagen."""
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


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
    imagenes = PackingImagenSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = PackingTipo
        fields = ['id', 'tipo_fruta', 'tipo_fruta_nombre', 'kg_total', 'estado', 'estado_display', 'detalles', 'imagenes']
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
    imagenes = PackingImagenSerializer(many=True, read_only=True)
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
            'imagenes',
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
        """Actualizar el packing semanal preservando detalles con subastas activas."""
        tipos_data = validated_data.pop('tipos')
        
        with transaction.atomic(): # Si algo falla, no se borra nada
            # Actualizar cabecera
            instance.empresa = validated_data.get('empresa', instance.empresa)
            instance.fecha_inicio_semana = validated_data.get('fecha_inicio_semana', instance.fecha_inicio_semana)
            instance.fecha_fin_semana = validated_data.get('fecha_fin_semana', instance.fecha_fin_semana)
            instance.observaciones = validated_data.get('observaciones', instance.observaciones)
            instance.estado = validated_data.get('estado', instance.estado)
            instance.save()
            
            # Guardar mapeo de imágenes y detalles por tipo de fruta
            imagenes_por_tipo = {}
            detalles_existentes_por_tipo_y_dia = {}
            
            for tipo_existente in instance.tipos.all():
                tipo_fruta_id = tipo_existente.tipo_fruta.id
                
                # Guardar imágenes
                imagenes = list(tipo_existente.imagenes.all())
                if imagenes:
                    imagenes_por_tipo[tipo_fruta_id] = imagenes
                
                # Guardar detalles existentes por día
                if tipo_fruta_id not in detalles_existentes_por_tipo_y_dia:
                    detalles_existentes_por_tipo_y_dia[tipo_fruta_id] = {}
                
                for detalle in tipo_existente.detalles.all():
                    detalles_existentes_por_tipo_y_dia[tipo_fruta_id][detalle.dia] = detalle
            
            # Desvincular imágenes antes de eliminar tipos
            PackingImagen.objects.filter(packing_tipo__packing_semanal=instance).update(packing_tipo=None)
            
            # Eliminar solo los tipos que NO tienen detalles con subastas
            # Para tipos con subastas, eliminar solo detalles sin subastas
            for tipo_existente in instance.tipos.all():
                detalles_con_subastas = []
                detalles_sin_subastas = []
                
                for detalle in tipo_existente.detalles.all():
                    if hasattr(detalle, 'subasta'):
                        detalles_con_subastas.append(detalle)
                    else:
                        detalles_sin_subastas.append(detalle)
                
                # Eliminar solo detalles sin subastas
                for detalle in detalles_sin_subastas:
                    detalle.delete()
            
            # Ahora eliminar tipos que quedaron sin detalles
            for tipo_existente in instance.tipos.all():
                if tipo_existente.detalles.count() == 0:
                    tipo_existente.delete()
            
            # Recrear/actualizar tipos
            for tipo_data in tipos_data:
                detalles_data = tipo_data.pop('detalles')
                tipo_fruta = tipo_data['tipo_fruta']
                
                # Buscar si ya existe un tipo para esta fruta (con detalles con subastas)
                packing_tipo = instance.tipos.filter(tipo_fruta=tipo_fruta).first()
                
                if not packing_tipo:
                    # Crear nuevo tipo si no existe
                    packing_tipo = PackingTipo.objects.create(
                        packing_semanal=instance,
                        tipo_fruta=tipo_fruta
                    )
                
                # Procesar detalles
                detalles_existentes = detalles_existentes_por_tipo_y_dia.get(tipo_fruta.id, {})
                
                for detalle_data in detalles_data:
                    dia = detalle_data['dia']
                    
                    # Si existe un detalle para este día y tiene subasta, actualizarlo
                    detalle_existente = detalles_existentes.get(dia)
                    if detalle_existente and hasattr(detalle_existente, 'subasta'):
                        # Actualizar el detalle existente en lugar de crear uno nuevo
                        detalle_existente.fecha = detalle_data['fecha']
                        detalle_existente.py = detalle_data['py']
                        detalle_existente.save()
                    else:
                        # Crear nuevo detalle si no existe o no tiene subasta
                        PackingDetalle.objects.create(
                            packing_tipo=packing_tipo,
                            **detalle_data
                        )
                
                packing_tipo.actualizar_kg_total()
                
                # Reasignar imágenes que tenía este tipo de fruta
                if tipo_fruta.id in imagenes_por_tipo:
                    for imagen in imagenes_por_tipo[tipo_fruta.id]:
                        imagen.packing_tipo = packing_tipo
                        imagen.save()
                
        return instance