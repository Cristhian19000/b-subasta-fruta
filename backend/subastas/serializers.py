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
# SERIALIZERS PARA APP MÓVIL ANDROID
# Formato exacto esperado por la aplicación Kotlin
# =============================================================================

from django.utils import timezone as django_timezone


class SubastaMovilListSerializer(serializers.ModelSerializer):
    """
    Listado de subastas para la app móvil Android.
    Formato exacto esperado por la app.
    """
    
    # Campos con nombres exactos que espera la app Android
    producto = serializers.SerializerMethodField()
    tipo = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    cantidad = serializers.SerializerMethodField()
    precio_base = serializers.DecimalField(max_digits=12, decimal_places=2)
    precio_actual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    imagen_url = serializers.SerializerMethodField()  # Primera imagen (compatibilidad)
    imagenes = serializers.SerializerMethodField()  # Array de todas las imágenes
    fecha = serializers.SerializerMethodField()  # Fecha de la subasta en UTC
    hora_inicio = serializers.SerializerMethodField()
    hora_fin = serializers.SerializerMethodField()
    # Timestamps en milisegundos UTC para el cronómetro
    hora_inicio_ms = serializers.SerializerMethodField()
    hora_fin_ms = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()
    descripcion = serializers.SerializerMethodField()
    unidad = serializers.SerializerMethodField()
    
    class Meta:
        model = Subasta
        fields = [
            'id',
            'producto',
            'tipo',
            'cantidad',
            'precio_base',
            'precio_actual',
            'imagen_url',
            'imagenes',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'hora_inicio_ms',
            'hora_fin_ms',
            'estado',
            'descripcion',
            'unidad',
        ]
    
    def get_producto(self, obj):
        """Nombre del producto (usamos el nombre de la empresa o ARÁNDANO por defecto)."""
        return "ARÁNDANO"
    
    def get_cantidad(self, obj):
        """Cantidad en formato legible."""
        kilos = obj.kilos_totales
        if kilos >= 1000:
            return f"{kilos / 1000:.1f} tn"
        return f"{kilos} kg"
    
    def get_imagen_url(self, obj):
        """URL completa de la imagen principal (primera imagen para compatibilidad)."""
        imagenes = obj.get_imagenes()
        if imagenes.exists():
            imagen = imagenes.first()
            request = self.context.get('request')
            if request and imagen.imagen:
                return request.build_absolute_uri(imagen.imagen.url)
            elif imagen.imagen:
                return imagen.imagen.url
        return None
    
    def get_imagenes(self, obj):
        """Array con URLs de todas las imágenes para carrusel."""
        imagenes = obj.get_imagenes()
        request = self.context.get('request')
        urls = []
        
        for imagen in imagenes:
            if imagen.imagen:
                if request:
                    urls.append(request.build_absolute_uri(imagen.imagen.url))
                else:
                    urls.append(imagen.imagen.url)
        
        return urls
    
    def get_fecha(self, obj):
        """Fecha de la subasta en UTC (YYYY-MM-DD)."""
        # Usamos UTC para consistencia con el cronómetro
        return obj.fecha_hora_inicio.strftime("%Y-%m-%d")
    
    def get_hora_inicio(self, obj):
        """Hora de inicio en formato HH:MM (UTC)."""
        return obj.fecha_hora_inicio.strftime("%H:%M")
    
    def get_hora_fin(self, obj):
        """Hora de fin en formato HH:MM (UTC)."""
        return obj.fecha_hora_fin.strftime("%H:%M")
    
    def get_hora_inicio_ms(self, obj):
        """Timestamp de inicio en milisegundos UTC (para cronómetro)."""
        return int(obj.fecha_hora_inicio.timestamp() * 1000)
    
    def get_hora_fin_ms(self, obj):
        """Timestamp de fin en milisegundos UTC (para cronómetro)."""
        return int(obj.fecha_hora_fin.timestamp() * 1000)
    
    def get_estado(self, obj):
        """Estado en minúsculas como espera la app."""
        estado = obj.estado_calculado
        return estado.lower()
    
    def get_descripcion(self, obj):
        """Descripción del producto."""
        empresa = obj.empresa.nombre
        tipo = obj.tipo_fruta.nombre
        return f"{tipo} - {empresa}"
    
    def get_unidad(self, obj):
        """Unidad de medida."""
        return "kg"


class SubastaMovilDetailSerializer(serializers.ModelSerializer):
    """
    Detalle de subasta para la app móvil Android.
    Incluye información de pujas y última puja del usuario.
    """
    
    producto = serializers.SerializerMethodField()
    tipo = serializers.CharField(source='tipo_fruta.nombre', read_only=True)
    cantidad = serializers.SerializerMethodField()
    precio_base = serializers.DecimalField(max_digits=12, decimal_places=2)
    precio_actual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    imagen_url = serializers.SerializerMethodField()  # Primera imagen (compatibilidad)
    imagenes = serializers.SerializerMethodField()  # Array de todas las imágenes
    fecha = serializers.SerializerMethodField()  # Fecha de la subasta en UTC
    hora_inicio = serializers.SerializerMethodField()
    hora_fin = serializers.SerializerMethodField()
    # Timestamps en milisegundos UTC para el cronómetro
    hora_inicio_ms = serializers.SerializerMethodField()
    hora_fin_ms = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()
    descripcion = serializers.SerializerMethodField()
    total_pujas = serializers.SerializerMethodField()
    ultima_puja = serializers.SerializerMethodField()
    mi_ultima_puja = serializers.SerializerMethodField()
    
    class Meta:
        model = Subasta
        fields = [
            'id',
            'producto',
            'tipo',
            'cantidad',
            'precio_base',
            'precio_actual',
            'imagen_url',
            'imagenes',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'hora_inicio_ms',
            'hora_fin_ms',
            'estado',
            'descripcion',
            'total_pujas',
            'ultima_puja',
            'mi_ultima_puja',
        ]
    
    def get_producto(self, obj):
        return "ARÁNDANO"
    
    def get_cantidad(self, obj):
        kilos = obj.kilos_totales
        if kilos >= 1000:
            return f"{kilos / 1000:.1f} tn"
        return f"{kilos} kg"
    
    def get_imagen_url(self, obj):
        """URL de la primera imagen (compatibilidad)."""
        imagenes = obj.get_imagenes()
        if imagenes.exists():
            imagen = imagenes.first()
            request = self.context.get('request')
            if request and imagen.imagen:
                return request.build_absolute_uri(imagen.imagen.url)
        return None
    
    def get_imagenes(self, obj):
        """Array con URLs de todas las imágenes para carrusel."""
        imagenes = obj.get_imagenes()
        request = self.context.get('request')
        urls = []
        
        for imagen in imagenes:
            if imagen.imagen:
                if request:
                    urls.append(request.build_absolute_uri(imagen.imagen.url))
                else:
                    urls.append(imagen.imagen.url)
        
        return urls
    
    def get_fecha(self, obj):
        """Fecha de la subasta en UTC (YYYY-MM-DD)."""
        return obj.fecha_hora_inicio.strftime("%Y-%m-%d")
    
    def get_hora_inicio(self, obj):
        """Hora de inicio en formato HH:MM (UTC)."""
        return obj.fecha_hora_inicio.strftime("%H:%M")
    
    def get_hora_fin(self, obj):
        """Hora de fin en formato HH:MM (UTC)."""
        return obj.fecha_hora_fin.strftime("%H:%M")
    
    def get_hora_inicio_ms(self, obj):
        """Timestamp de inicio en milisegundos UTC (para cronómetro)."""
        return int(obj.fecha_hora_inicio.timestamp() * 1000)
    
    def get_hora_fin_ms(self, obj):
        """Timestamp de fin en milisegundos UTC (para cronómetro)."""
        return int(obj.fecha_hora_fin.timestamp() * 1000)
    
    def get_estado(self, obj):
        return obj.estado_calculado.lower()
    
    def get_descripcion(self, obj):
        empresa = obj.empresa.nombre
        tipo = obj.tipo_fruta.nombre
        return f"{tipo} - {empresa}"
    
    def get_total_pujas(self, obj):
        return obj.ofertas.count()
    
    def get_ultima_puja(self, obj):
        """Última puja realizada (la ganadora actual)."""
        oferta = obj.oferta_ganadora
        if oferta:
            return {
                'id': oferta.id,
                'monto': float(oferta.monto),
                'fecha_hora': oferta.fecha_oferta.isoformat(),
                'es_ganadora': oferta.es_ganadora
            }
        return None
    
    def get_mi_ultima_puja(self, obj):
        """Última puja del cliente autenticado."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user:
            # El user aquí es el Cliente (por ClienteJWTAuthentication)
            cliente = request.user
            if hasattr(cliente, 'id'):
                mi_puja = obj.ofertas.filter(cliente_id=cliente.id).order_by('-fecha_oferta').first()
                if mi_puja:
                    return float(mi_puja.monto)
        return None


class PujaMovilSerializer(serializers.ModelSerializer):
    """Serializer para listar pujas de una subasta."""
    
    fecha_hora = serializers.DateTimeField(source='fecha_oferta', read_only=True)
    
    class Meta:
        model = Oferta
        fields = ['id', 'monto', 'fecha_hora']


class HistorialPujaSerializer(serializers.ModelSerializer):
    """Serializer para el historial de pujas del cliente."""
    
    subasta_id = serializers.IntegerField(source='subasta.id', read_only=True)
    producto = serializers.SerializerMethodField()
    fecha_hora = serializers.DateTimeField(source='fecha_oferta', read_only=True)
    estado = serializers.SerializerMethodField()
    
    class Meta:
        model = Oferta
        fields = ['id', 'subasta_id', 'producto', 'monto', 'fecha_hora', 'es_ganadora', 'estado']
    
    def get_producto(self, obj):
        return "ARÁNDANO"
    
    def get_estado(self, obj):
        """Estado de la puja: ganadora, superada, en_curso."""
        if obj.es_ganadora:
            subasta_estado = obj.subasta.estado_calculado
            if subasta_estado == 'FINALIZADA':
                return 'ganadora'
            return 'ganando'
        else:
            # Verificar si la subasta sigue activa
            if obj.subasta.esta_activa:
                return 'superada'
            return 'perdida'
