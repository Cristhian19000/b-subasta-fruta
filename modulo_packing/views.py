"""
Views para el Módulo de Packing.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count

from .models import Empresa, TipoFruta, PackingSemanal, PackingTipo, PackingDetalle
from .serializers import (
    EmpresaSerializer,
    TipoFrutaSerializer,
    PackingSemanalListSerializer,
    PackingSemanalDetailSerializer,
    PackingSemanalCreateSerializer,
    PackingTipoSerializer,
)


class EmpresaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Empresas."""
    
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar empresas activas si se solicita."""
        queryset = super().get_queryset()
        activo = self.request.query_params.get('activo', None)
        
        if activo is not None:
            activo = activo.lower() == 'true'
            queryset = queryset.filter(activo=activo)
        
        return queryset.order_by('nombre')


class TipoFrutaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Tipos de Fruta."""
    
    queryset = TipoFruta.objects.all()
    serializer_class = TipoFrutaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar tipos activos si se solicita."""
        queryset = super().get_queryset()
        activo = self.request.query_params.get('activo', None)
        
        if activo is not None:
            activo = activo.lower() == 'true'
            queryset = queryset.filter(activo=activo)
        
        return queryset.order_by('nombre')


class PackingSemanalViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Packings Semanales.
    
    Soporta:
    - Listado con filtros (por empresa, estado, fechas)
    - Detalle con tipos y detalles anidados
    - Crear/Actualizar packing completo en una sola operación
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Obtener queryset con anotaciones y filtros."""
        queryset = PackingSemanal.objects.select_related('empresa').annotate(
            num_tipos=Count('tipos')
        )
        
        # Filtro por empresa
        empresa_id = self.request.query_params.get('empresa', None)
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        
        # Filtro por estado
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Filtro por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        
        if fecha_desde:
            queryset = queryset.filter(fecha_inicio_semana__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_inicio_semana__lte=fecha_hasta)
        
        return queryset.order_by('-fecha_inicio_semana', 'empresa__nombre')
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción."""
        if self.action == 'list':
            return PackingSemanalListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PackingSemanalCreateSerializer
        return PackingSemanalDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Crear un packing semanal completo."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Devolver los datos completos del packing creado
        output_serializer = PackingSemanalDetailSerializer(instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Actualizar un packing semanal completo."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Devolver los datos completos del packing actualizado
        output_serializer = PackingSemanalDetailSerializer(instance)
        return Response(output_serializer.data)
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambiar el estado de un packing semanal.
        
        Body: { "estado": "ACTIVO" | "CERRADO" | "ANULADO" | "PROYECTADO" }
        """
        packing = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if not nuevo_estado:
            return Response(
                {'error': 'Debe proporcionar el nuevo estado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estados_validos = [choice[0] for choice in PackingSemanal.ESTADO_CHOICES]
        if nuevo_estado not in estados_validos:
            return Response(
                {'error': f'Estado inválido. Debe ser uno de: {estados_validos}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        packing.estado = nuevo_estado
        packing.save()
        
        serializer = PackingSemanalDetailSerializer(packing)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Obtener resumen de packings por estado.
        
        Devuelve conteo de packings por cada estado.
        """
        from django.db.models import Sum
        
        queryset = PackingSemanal.objects.all()
        
        # Filtrar por empresa si se especifica
        empresa_id = request.query_params.get('empresa', None)
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        
        resumen = []
        for estado_code, estado_label in PackingSemanal.ESTADO_CHOICES:
            qs = queryset.filter(estado=estado_code)
            resumen.append({
                'estado': estado_code,
                'estado_display': estado_label,
                'cantidad': qs.count(),
                'kg_total': qs.aggregate(total=Sum('kg_total'))['total'] or 0
            })
        
        return Response(resumen)


class PackingTipoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para tipos de fruta en packings.
    
    Útil para consultas específicas de tipos de fruta.
    """
    
    queryset = PackingTipo.objects.select_related('packing_semanal', 'tipo_fruta').all()
    serializer_class = PackingTipoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar por packing si se especifica."""
        queryset = super().get_queryset()
        
        packing_id = self.request.query_params.get('packing', None)
        if packing_id:
            queryset = queryset.filter(packing_semanal_id=packing_id)
        
        tipo_fruta_id = self.request.query_params.get('tipo_fruta', None)
        if tipo_fruta_id:
            queryset = queryset.filter(tipo_fruta_id=tipo_fruta_id)
        
        return queryset.order_by('tipo_fruta__nombre')

