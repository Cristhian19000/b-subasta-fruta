"""
Serializers para el Módulo de Subastas.

Estructura:
- SubastaListSerializer: Para listado de subastas
- SubastaDetailSerializer: Para ver detalle con ofertas
- SubastaCreateSerializer: Para crear/programar subastas
- OfertaSerializer: Para las pujas
"""

from rest_framework import serializers
from django.utils import timezone

from .models import Subasta, Oferta
from modulo_packing.serializers import PackingImagenSerializer


class OfertaSerializer(serializers.ModelSerializer):
    """Serializer para ofertas/pujas."""
    
    cliente_nombre = serializers.CharField(source='cliente.nombre_razon_social', read_only=True)
    cliente_ruc_dni = serializers.CharField(source='cliente.ruc_dni', read_only=True)
    
    class Meta:
        model = Oferta
        fields = [
            'id',
            'subasta',
            'cliente',
            'cliente_nombre',
            'cliente_ruc_dni',
            'monto',
            'es_ganadora',
            'fecha_oferta',
        ]
        read_only_fields = ['id', 'es_ganadora', 'fecha_oferta']


class OfertaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear ofertas desde la app móvil."""
    
    class Meta:
        model = Oferta
        fields = ['subasta', 'cliente', 'monto']
    
    def validate(self, data):
        """
        RN-02: Validación de pujas.
        - La subasta debe estar activa
        - El monto debe ser superior al precio actual
        """
        subasta = data['subasta']
        monto = data['monto']
        
        # Verificar si puede ofertar
        puede, mensaje = subasta.puede_ofertar(monto)
        if not puede:
            raise serializers.ValidationError({'monto': mensaje})
        
        return data


class SubastaListSerializer(serializers.ModelSerializer):
    """Serializer para listado de subastas."""
    
    # Datos del packing
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    tipo_fruta_nombre = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    fecha_produccion = serializers.DateField(source='packing_detalle.fecha', read_only=True)
    dia = serializers.CharField(source='packing_detalle.dia', read_only=True)
    kilos = serializers.DecimalField(source='kilos_totales', max_digits=10, decimal_places=2, read_only=True)
    
    # Estado y tiempo
    estado_actual = serializers.CharField(source='estado_calculado', read_only=True)
    tiempo_restante = serializers.IntegerField(source='tiempo_restante_segundos', read_only=True)
    
    # Precio
    precio_actual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Ganador actual
    cliente_ganando = serializers.SerializerMethodField()
    total_ofertas = serializers.SerializerMethodField()
    
    class Meta:
        model = Subasta
        fields = [
            'id',
            'packing_detalle',
            'empresa_nombre',
            'tipo_fruta_nombre',
            'fecha_produccion',
            'dia',
            'kilos',
            'fecha_hora_inicio',
            'fecha_hora_fin',
            'precio_base',
            'precio_actual',
            'estado',
            'estado_actual',
            'tiempo_restante',
            'cliente_ganando',
            'total_ofertas',
            'fecha_creacion',
        ]
    
    def get_cliente_ganando(self, obj):
        """Obtiene el cliente que va ganando."""
        oferta = obj.oferta_ganadora
        if oferta:
            return {
                'id': oferta.cliente.id,
                'nombre': oferta.cliente.nombre_razon_social,
                'monto': str(oferta.monto)
            }
        return None
    
    def get_total_ofertas(self, obj):
        """Total de ofertas en la subasta."""
        return obj.ofertas.count()


class SubastaDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de subasta con historial de ofertas."""
    
    # Datos del packing
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    tipo_fruta_nombre = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    fecha_produccion = serializers.DateField(source='packing_detalle.fecha', read_only=True)
    dia = serializers.CharField(source='packing_detalle.dia', read_only=True)
    dia_display = serializers.CharField(source='packing_detalle.get_dia_display', read_only=True)
    kilos = serializers.DecimalField(source='kilos_totales', max_digits=10, decimal_places=2, read_only=True)
    
    # Estado y tiempo
    estado_actual = serializers.CharField(source='estado_calculado', read_only=True)
    tiempo_restante = serializers.IntegerField(source='tiempo_restante_segundos', read_only=True)
    
    # Precio
    precio_actual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Historial de ofertas (RF-03)
    ofertas = OfertaSerializer(many=True, read_only=True)
    
    # Imágenes (RN-01: Jerarquía de imágenes)
    imagenes = serializers.SerializerMethodField()
    
    # Información del packing semanal
    packing_semanal_id = serializers.IntegerField(source='packing_semanal.id', read_only=True)
    semana = serializers.SerializerMethodField()
    
    class Meta:
        model = Subasta
        fields = [
            'id',
            'packing_detalle',
            'packing_semanal_id',
            'empresa_nombre',
            'tipo_fruta_nombre',
            'fecha_produccion',
            'dia',
            'dia_display',
            'kilos',
            'semana',
            'fecha_hora_inicio',
            'fecha_hora_fin',
            'precio_base',
            'precio_actual',
            'estado',
            'estado_actual',
            'tiempo_restante',
            'ofertas',
            'imagenes',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
    
    def get_imagenes(self, obj):
        """Obtiene las imágenes según la jerarquía RN-01."""
        imagenes = obj.get_imagenes()
        request = self.context.get('request')
        return PackingImagenSerializer(imagenes, many=True, context={'request': request}).data
    
    def get_semana(self, obj):
        """Información de la semana del packing."""
        ps = obj.packing_semanal
        return {
            'fecha_inicio': ps.fecha_inicio_semana,
            'fecha_fin': ps.fecha_fin_semana,
            'estado': ps.estado
        }


class SubastaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear/programar subastas (RF-01)."""
    
    class Meta:
        model = Subasta
        fields = [
            'packing_detalle',
            'fecha_hora_inicio',
            'fecha_hora_fin',
            'precio_base',
        ]
    
    def validate_packing_detalle(self, value):
        """RF-01: Solo una subasta por registro de producción."""
        # Verificar si ya existe una subasta para este detalle
        if Subasta.objects.filter(packing_detalle=value).exists():
            raise serializers.ValidationError(
                "Ya existe una subasta para este registro de producción."
            )
        return value
    
    def validate(self, data):
        """Validaciones adicionales."""
        fecha_inicio = data.get('fecha_hora_inicio')
        fecha_fin = data.get('fecha_hora_fin')
        
        if fecha_fin <= fecha_inicio:
            raise serializers.ValidationError({
                'fecha_hora_fin': 'La fecha de finalización debe ser posterior a la de inicio.'
            })
        
        # NOTA: Restricción de fecha futura deshabilitada para pruebas
        # if fecha_inicio <= timezone.now():
        #     raise serializers.ValidationError({
        #         'fecha_hora_inicio': 'La fecha de inicio debe ser futura.'
        #     })
        
        return data


class SubastaUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar subastas."""
    
    class Meta:
        model = Subasta
        fields = [
            'fecha_hora_inicio',
            'fecha_hora_fin',
            'precio_base',
            'estado',
        ]
    
    def validate(self, data):
        """Validaciones de actualización."""
        instance = self.instance
        fecha_inicio = data.get('fecha_hora_inicio', instance.fecha_hora_inicio)
        fecha_fin = data.get('fecha_hora_fin', instance.fecha_hora_fin)
        
        if fecha_fin <= fecha_inicio:
            raise serializers.ValidationError({
                'fecha_hora_fin': 'La fecha de finalización debe ser posterior a la de inicio.'
            })
        
        # No se puede modificar una subasta finalizada (excepto para cancelarla)
        if instance.estado_calculado == 'FINALIZADA' and data.get('estado') != 'CANCELADA':
            raise serializers.ValidationError(
                "No se puede modificar una subasta finalizada."
            )
        
        return data


# =============================================================================
# SERIALIZERS PARA APP MÓVIL
# =============================================================================

class SubastaMovilListSerializer(serializers.ModelSerializer):
    """
    RF-04: Listado de subastas para la app móvil.
    Tarjetas informativas con información del producto.
    """
    
    tipo_fruta = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    empresa = serializers.CharField(source='empresa.nombre', read_only=True)
    fecha_produccion = serializers.DateField(source='packing_detalle.fecha', read_only=True)
    kilos = serializers.DecimalField(source='kilos_totales', max_digits=10, decimal_places=2, read_only=True)
    
    # Estado para mostrar etiquetas "Próximamente" o "En Vivo"
    estado_actual = serializers.CharField(source='estado_calculado', read_only=True)
    etiqueta = serializers.SerializerMethodField()
    
    # Precio actual
    precio_actual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Tiempo restante (para RF-06)
    tiempo_restante = serializers.IntegerField(source='tiempo_restante_segundos', read_only=True)
    
    # Imagen principal
    imagen_principal = serializers.SerializerMethodField()
    
    class Meta:
        model = Subasta
        fields = [
            'id',
            'tipo_fruta',
            'empresa',
            'fecha_produccion',
            'kilos',
            'fecha_hora_inicio',
            'fecha_hora_fin',
            'precio_base',
            'precio_actual',
            'estado_actual',
            'etiqueta',
            'tiempo_restante',
            'imagen_principal',
        ]
    
    def get_etiqueta(self, obj):
        """RF-04: Etiquetas para la app."""
        estado = obj.estado_calculado
        if estado == 'PROGRAMADA':
            return 'Próximamente'
        elif estado == 'ACTIVA':
            return 'En Vivo'
        elif estado == 'FINALIZADA':
            return 'Finalizada'
        return 'Cancelada'
    
    def get_imagen_principal(self, obj):
        """Obtiene la primera imagen según la jerarquía."""
        imagenes = obj.get_imagenes()
        if imagenes.exists():
            imagen = imagenes.first()
            request = self.context.get('request')
            if request and imagen.imagen:
                return request.build_absolute_uri(imagen.imagen.url)
            elif imagen.imagen:
                return imagen.imagen.url
        return None


class SubastaMovilDetailSerializer(SubastaDetailSerializer):
    """
    RF-05 y RF-06: Detalle de subasta para app móvil.
    Incluye información para subastas programadas y activas.
    """
    
    etiqueta = serializers.SerializerMethodField()
    puede_ofertar = serializers.SerializerMethodField()
    
    class Meta(SubastaDetailSerializer.Meta):
        fields = SubastaDetailSerializer.Meta.fields + ['etiqueta', 'puede_ofertar']
    
    def get_etiqueta(self, obj):
        """Etiqueta de estado."""
        estado = obj.estado_calculado
        if estado == 'PROGRAMADA':
            return 'Próximamente'
        elif estado == 'ACTIVA':
            return 'En Vivo'
        elif estado == 'FINALIZADA':
            return 'Finalizada'
        return 'Cancelada'
    
    def get_puede_ofertar(self, obj):
        """RF-05: Indica si el botón de ofertar debe estar habilitado."""
        return obj.esta_activa
