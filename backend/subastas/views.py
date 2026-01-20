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
    PujaMovilSerializer,
    HistorialPujaSerializer,
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
# ENDPOINTS PARA APP MÓVIL ANDROID
# Requieren autenticación JWT de Cliente
# =============================================================================

from clientes.authentication import ClienteJWTAuthentication
from clientes.models import Cliente


class IsClienteAuthenticated:
    """
    Permiso personalizado que verifica si el usuario autenticado es un Cliente.
    """
    def has_permission(self, request, view):
        return request.user and isinstance(request.user, Cliente)


class SubastaMovilViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para la app móvil Android.
    
    Endpoints:
    - GET /api/subastas/         -> Lista de subastas activas
    - GET /api/subastas/{id}/    -> Detalle de una subasta
    - GET /api/subastas/{id}/pujas/ -> Pujas de una subasta
    """
    
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Deshabilitar paginación para app móvil
    
    def get_queryset(self):
        """Obtener subastas disponibles para clientes."""
        ahora = timezone.now()
        
        queryset = Subasta.objects.select_related(
            'packing_detalle',
            'packing_detalle__packing_tipo',
            'packing_detalle__packing_tipo__tipo_fruta',
            'packing_detalle__packing_tipo__packing_semanal',
            'packing_detalle__packing_tipo__packing_semanal__empresa',
        ).prefetch_related('ofertas').exclude(estado='CANCELADA')
        
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
            # Por defecto, mostrar programadas y activas (no finalizadas)
            queryset = queryset.filter(fecha_hora_fin__gte=ahora)
        
        return queryset.order_by('fecha_hora_inicio')
    
    def get_serializer_class(self):
        """Usar serializer según la acción."""
        if self.action == 'list':
            return SubastaMovilListSerializer
        return SubastaMovilDetailSerializer
    
    @action(detail=True, methods=['get'])
    def pujas(self, request, pk=None):
        """
        GET /api/subastas/{id}/pujas/
        Lista de pujas de una subasta específica.
        """
        subasta = self.get_object()
        pujas = subasta.ofertas.all().order_by('-monto')
        serializer = PujaMovilSerializer(pujas, many=True)
        return Response(serializer.data)


class PujaMovilViewSet(viewsets.ViewSet):
    """
    ViewSet para pujas desde la app móvil Android.
    
    Endpoints:
    - POST /api/pujas/           -> Enviar una puja
    - GET /api/pujas/historial/  -> Historial de pujas del cliente
    """
    
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """
        POST /api/pujas/
        Enviar una puja/oferta.
        
        Body: { "subasta_id": 1, "monto": 5.90 }
        """
        subasta_id = request.data.get('subasta_id')
        monto = request.data.get('monto')
        
        # Validar campos requeridos
        if not subasta_id:
            return Response(
                {'success': False, 'error': 'Se requiere subasta_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not monto:
            return Response(
                {'success': False, 'error': 'Se requiere monto'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            monto = float(monto)
        except ValueError:
            return Response(
                {'success': False, 'error': 'El monto debe ser un número válido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener el cliente del token JWT
        cliente = request.user  # Es un objeto Cliente por ClienteJWTAuthentication
        
        # Buscar la subasta
        try:
            subasta = Subasta.objects.get(pk=subasta_id)
        except Subasta.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Subasta no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Usar transacción para control de concurrencia
        with transaction.atomic():
            # Bloquear la subasta
            subasta = Subasta.objects.select_for_update().get(pk=subasta_id)
            
            # Validar oferta
            puede, mensaje = subasta.puede_ofertar(monto)
            if not puede:
                return Response(
                    {
                        'success': False,
                        'error': f'La oferta debe ser mayor al precio actual de S/ {subasta.precio_actual}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear la oferta
            oferta = Oferta.objects.create(
                subasta=subasta,
                cliente=cliente,
                monto=monto
            )
        
        return Response({
            'id': oferta.id,
            'success': True,
            'message': 'Oferta registrada exitosamente',
            'precio_actual': float(oferta.monto)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def historial(self, request):
        """
        GET /api/pujas/historial/
        Historial de pujas del cliente autenticado.
        """
        cliente = request.user  # Es un objeto Cliente
        
        pujas = Oferta.objects.filter(cliente=cliente).select_related(
            'subasta',
            'subasta__packing_detalle',
            'subasta__packing_detalle__packing_tipo',
            'subasta__packing_detalle__packing_tipo__tipo_fruta',
        ).order_by('-fecha_oferta')
        
        serializer = HistorialPujaSerializer(pujas, many=True)
        return Response(serializer.data)

