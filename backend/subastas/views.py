"""
Views para el Módulo de Subastas.

Incluye:
- SubastaViewSet: CRUD de subastas (panel admin)
- OfertaViewSet: Gestión de ofertas
- Endpoints para app móvil
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.db.models import F, Count
from django.utils import timezone

from .models import Subasta, Oferta
from .serializers import (
    SubastaListSerializer,
    SubastaDetailSerializer,
    SubastaCreateSerializer,
    SubastaUpdateSerializer,
    OfertaSerializer,
    OfertaCreateSerializer,
    SubastaMovilListSerializer,
    SubastaMovilDetailSerializer,
)


class SubastaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Subastas (Panel Administrativo).
    
    RF-01: Programación de subastas
    RF-02: Monitoreo de estado
    RF-03: Visualización de ganadores
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Obtener subastas con filtros."""
        queryset = Subasta.objects.select_related(
            'packing_detalle',
            'packing_detalle__packing_tipo',
            'packing_detalle__packing_tipo__tipo_fruta',
            'packing_detalle__packing_tipo__packing_semanal',
            'packing_detalle__packing_tipo__packing_semanal__empresa',
        ).prefetch_related('ofertas', 'ofertas__cliente')
        
        # Filtro por estado
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Filtro por empresa
        empresa_id = self.request.query_params.get('empresa', None)
        if empresa_id:
            queryset = queryset.filter(
                packing_detalle__packing_tipo__packing_semanal__empresa_id=empresa_id
            )
        
        # Filtro por packing semanal
        packing_semanal_id = self.request.query_params.get('packing_semanal', None)
        if packing_semanal_id:
            queryset = queryset.filter(
                packing_detalle__packing_tipo__packing_semanal_id=packing_semanal_id
            )
        
        # Filtro por fecha de producción
        fecha = self.request.query_params.get('fecha', None)
        if fecha:
            queryset = queryset.filter(packing_detalle__fecha=fecha)
        
        # Filtro para subastas activas (en tiempo real)
        activas = self.request.query_params.get('activas', None)
        if activas and activas.lower() == 'true':
            ahora = timezone.now()
            queryset = queryset.filter(
                fecha_hora_inicio__lte=ahora,
                fecha_hora_fin__gte=ahora
            ).exclude(estado='CANCELADA')
        
        return queryset.order_by('-fecha_hora_inicio')
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción."""
        if self.action == 'list':
            return SubastaListSerializer
        elif self.action == 'create':
            return SubastaCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SubastaUpdateSerializer
        return SubastaDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """RF-01: Crear/programar una subasta."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Devolver los datos completos
        output_serializer = SubastaDetailSerializer(instance, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar una subasta."""
        subasta = self.get_object()
        
        if subasta.estado == 'CANCELADA':
            return Response(
                {'error': 'La subasta ya está cancelada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if subasta.estado_calculado == 'FINALIZADA':
            return Response(
                {'error': 'No se puede cancelar una subasta finalizada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        subasta.estado = 'CANCELADA'
        subasta.save()
        
        serializer = SubastaDetailSerializer(subasta, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def historial_ofertas(self, request, pk=None):
        """RF-03: Ver historial completo de ofertas."""
        subasta = self.get_object()
        ofertas = subasta.ofertas.all().order_by('-fecha_oferta')
        serializer = OfertaSerializer(ofertas, many=True)
        return Response({
            'subasta_id': subasta.id,
            'total_ofertas': ofertas.count(),
            'oferta_ganadora': OfertaSerializer(subasta.oferta_ganadora).data if subasta.oferta_ganadora else None,
            'historial': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Resumen de subastas por estado."""
        ahora = timezone.now()
        
        # Calcular estados en tiempo real
        programadas = Subasta.objects.filter(
            fecha_hora_inicio__gt=ahora
        ).exclude(estado='CANCELADA').count()
        
        activas = Subasta.objects.filter(
            fecha_hora_inicio__lte=ahora,
            fecha_hora_fin__gte=ahora
        ).exclude(estado='CANCELADA').count()
        
        finalizadas = Subasta.objects.filter(
            fecha_hora_fin__lt=ahora
        ).exclude(estado='CANCELADA').count()
        
        canceladas = Subasta.objects.filter(estado='CANCELADA').count()
        
        return Response({
            'programadas': programadas,
            'activas': activas,
            'finalizadas': finalizadas,
            'canceladas': canceladas,
            'total': programadas + activas + finalizadas + canceladas
        })
    
    @action(detail=False, methods=['post'])
    def actualizar_estados(self, request):
        """
        Actualiza los estados de las subastas basándose en las fechas.
        Este endpoint puede llamarse periódicamente o mediante un cron job.
        """
        ahora = timezone.now()
        actualizados = 0
        
        # Subastas que deben pasar a ACTIVA
        subastas_activar = Subasta.objects.filter(
            estado='PROGRAMADA',
            fecha_hora_inicio__lte=ahora,
            fecha_hora_fin__gte=ahora
        )
        actualizados += subastas_activar.update(estado='ACTIVA')
        
        # Subastas que deben pasar a FINALIZADA
        subastas_finalizar = Subasta.objects.filter(
            fecha_hora_fin__lt=ahora
        ).exclude(estado__in=['FINALIZADA', 'CANCELADA'])
        actualizados += subastas_finalizar.update(estado='FINALIZADA')
        
        return Response({
            'mensaje': f'Se actualizaron {actualizados} subastas.',
            'timestamp': ahora.isoformat()
        })


class OfertaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Ofertas/Pujas.
    
    RN-02: Validación de pujas
    RN-03: Manejo de concurrencia
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = OfertaSerializer
    
    def get_queryset(self):
        """Obtener ofertas con filtros."""
        queryset = Oferta.objects.select_related('subasta', 'cliente')
        
        # Filtro por subasta
        subasta_id = self.request.query_params.get('subasta', None)
        if subasta_id:
            queryset = queryset.filter(subasta_id=subasta_id)
        
        # Filtro por cliente
        cliente_id = self.request.query_params.get('cliente', None)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        
        # Solo ofertas ganadoras
        ganadoras = self.request.query_params.get('ganadoras', None)
        if ganadoras and ganadoras.lower() == 'true':
            queryset = queryset.filter(es_ganadora=True)
        
        return queryset.order_by('-fecha_oferta')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        RN-02 y RN-03: Crear una oferta con validación y control de concurrencia.
        """
        serializer = OfertaCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        subasta = serializer.validated_data['subasta']
        monto = serializer.validated_data['monto']
        
        # Bloquear la subasta para control de concurrencia (RN-03)
        subasta = Subasta.objects.select_for_update().get(pk=subasta.pk)
        
        # Validar nuevamente después del bloqueo
        puede, mensaje = subasta.puede_ofertar(monto)
        if not puede:
            return Response(
                {'error': mensaje, 'precio_actual': str(subasta.precio_actual)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear la oferta
        oferta = serializer.save()
        
        output_serializer = OfertaSerializer(oferta)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


# =============================================================================
# ENDPOINTS PARA APP MÓVIL
# =============================================================================

class SubastaMovilViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para la app móvil (Kotlin).
    
    RF-04: Visualización de listado de subastas
    RF-05: Subastas programadas
    RF-06: Subastas activas
    """
    
    # Permitir acceso sin autenticación para listar subastas
    # En producción, requerir autenticación del cliente
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Obtener subastas disponibles para clientes."""
        ahora = timezone.now()
        
        queryset = Subasta.objects.select_related(
            'packing_detalle',
            'packing_detalle__packing_tipo',
            'packing_detalle__packing_tipo__tipo_fruta',
            'packing_detalle__packing_tipo__packing_semanal',
            'packing_detalle__packing_tipo__packing_semanal__empresa',
        ).exclude(estado='CANCELADA')
        
        # Filtro por estado
        estado = self.request.query_params.get('estado', None)
        if estado == 'programadas':
            queryset = queryset.filter(fecha_hora_inicio__gt=ahora)
        elif estado == 'activas':
            queryset = queryset.filter(
                fecha_hora_inicio__lte=ahora,
                fecha_hora_fin__gte=ahora
            )
        elif estado == 'finalizadas':
            queryset = queryset.filter(fecha_hora_fin__lt=ahora)
        else:
            # Por defecto, mostrar programadas y activas
            queryset = queryset.filter(fecha_hora_fin__gte=ahora)
        
        # Filtro por tipo de fruta
        tipo_fruta_id = self.request.query_params.get('tipo_fruta', None)
        if tipo_fruta_id:
            queryset = queryset.filter(
                packing_detalle__packing_tipo__tipo_fruta_id=tipo_fruta_id
            )
        
        return queryset.order_by('fecha_hora_inicio')
    
    def get_serializer_class(self):
        """Usar serializer según la acción."""
        if self.action == 'list':
            return SubastaMovilListSerializer
        return SubastaMovilDetailSerializer
    
    @action(detail=True, methods=['post'])
    def ofertar(self, request, pk=None):
        """
        RF-06: Endpoint para que el cliente haga una oferta.
        
        Body: { "cliente_id": int, "monto": decimal }
        """
        subasta = self.get_object()
        
        cliente_id = request.data.get('cliente_id')
        monto = request.data.get('monto')
        
        if not cliente_id or not monto:
            return Response(
                {'error': 'Se requiere cliente_id y monto.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            monto = float(monto)
        except ValueError:
            return Response(
                {'error': 'El monto debe ser un número válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Usar transacción para control de concurrencia (RN-03)
        with transaction.atomic():
            # Bloquear la subasta
            subasta = Subasta.objects.select_for_update().get(pk=subasta.pk)
            
            # Validar oferta (RN-02)
            puede, mensaje = subasta.puede_ofertar(monto)
            if not puede:
                return Response(
                    {
                        'error': mensaje,
                        'precio_actual': str(subasta.precio_actual),
                        'puede_ofertar': False
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear la oferta
            oferta = Oferta.objects.create(
                subasta=subasta,
                cliente_id=cliente_id,
                monto=monto
            )
        
        return Response({
            'success': True,
            'mensaje': 'Oferta registrada exitosamente.',
            'oferta': OfertaSerializer(oferta).data,
            'precio_actual': str(subasta.precio_actual),
            'es_ganador': oferta.es_ganadora
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def estado_tiempo_real(self, request, pk=None):
        """
        Endpoint para obtener el estado en tiempo real de la subasta.
        Útil para actualizar la UI de la app.
        """
        subasta = self.get_object()
        
        return Response({
            'subasta_id': subasta.id,
            'estado': subasta.estado_calculado,
            'precio_actual': str(subasta.precio_actual),
            'tiempo_restante': subasta.tiempo_restante_segundos,
            'total_ofertas': subasta.ofertas.count(),
            'cliente_ganando': {
                'id': subasta.oferta_ganadora.cliente.id,
                'nombre': subasta.oferta_ganadora.cliente.nombre_razon_social,
                'monto': str(subasta.oferta_ganadora.monto)
            } if subasta.oferta_ganadora else None
        })

