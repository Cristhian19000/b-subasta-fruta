"""
Vistas (Views) para el Módulo de Packing.

Este módulo contiene los ViewSets que manejan todas las operaciones
CRUD para Empresa, TipoFruta, Packing y PackingDetalle.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from datetime import datetime, timedelta

from .models import Empresa, TipoFruta, Packing, PackingDetalle
from .serializers import (
    EmpresaSerializer,
    TipoFrutaSerializer,
    PackingSerializer,
    PackingListSerializer,
    PackingCreateSerializer,
    PackingDetalleSerializer,
)


class EmpresaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Empresas.
    
    Endpoints disponibles:
        - GET    /api/empresas/          -> Listar empresas
        - POST   /api/empresas/          -> Crear empresa
        - GET    /api/empresas/{id}/     -> Obtener empresa
        - PUT    /api/empresas/{id}/     -> Actualizar empresa
        - DELETE /api/empresas/{id}/     -> Eliminar empresa
    """
    
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'fecha_creacion']
    ordering = ['nombre']
    
    def get_queryset(self):
        """
        Filtra las empresas, opcionalmente solo las activas.
        """
        queryset = Empresa.objects.all()
        activo = self.request.query_params.get('activo', None)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        return queryset


class TipoFrutaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Tipos de Fruta.
    
    Endpoints disponibles:
        - GET    /api/tipos-fruta/          -> Listar tipos
        - POST   /api/tipos-fruta/          -> Crear tipo
        - GET    /api/tipos-fruta/{id}/     -> Obtener tipo
        - PUT    /api/tipos-fruta/{id}/     -> Actualizar tipo
        - DELETE /api/tipos-fruta/{id}/     -> Eliminar tipo
    """
    
    queryset = TipoFruta.objects.all()
    serializer_class = TipoFrutaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'fecha_creacion']
    ordering = ['nombre']
    
    def get_queryset(self):
        """
        Filtra los tipos de fruta, opcionalmente solo los activos.
        """
        queryset = TipoFruta.objects.all()
        activo = self.request.query_params.get('activo', None)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        return queryset


class PackingViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Packings (proyecciones semanales).
    
    Endpoints disponibles:
        - GET    /api/packings/              -> Listar packings
        - POST   /api/packings/              -> Crear packing
        - GET    /api/packings/{id}/         -> Obtener packing con detalles
        - PUT    /api/packings/{id}/         -> Actualizar packing
        - DELETE /api/packings/{id}/         -> Eliminar packing
        
    Acciones personalizadas:
        - GET /api/packings/por_semana/      -> Filtrar por semana
        - GET /api/packings/resumen/         -> Resumen de kg por empresa
    """
    
    queryset = Packing.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['empresa__nombre', 'tipo_fruta__nombre']
    ordering_fields = ['fecha_proyeccion', 'kg_total', 'fecha_creacion']
    ordering = ['-fecha_proyeccion']
    
    def get_serializer_class(self):
        """
        Selecciona el serializer apropiado según la acción.
        """
        if self.action == 'list':
            return PackingListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PackingCreateSerializer
        return PackingSerializer
    
    def get_queryset(self):
        """
        Filtra los packings por empresa, tipo de fruta o fecha.
        """
        queryset = Packing.objects.all()
        
        # Filtro por empresa
        empresa_id = self.request.query_params.get('empresa', None)
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        
        # Filtro por tipo de fruta
        tipo_fruta_id = self.request.query_params.get('tipo_fruta', None)
        if tipo_fruta_id:
            queryset = queryset.filter(tipo_fruta_id=tipo_fruta_id)
        
        # Filtro por fecha de proyección
        fecha = self.request.query_params.get('fecha_proyeccion', None)
        if fecha:
            queryset = queryset.filter(fecha_proyeccion=fecha)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def por_semana(self, request):
        """
        Obtiene los packings de una semana específica.
        
        Parámetros:
            - fecha: Fecha de la semana (YYYY-MM-DD)
        """
        fecha_str = request.query_params.get('fecha', None)
        
        if not fecha_str:
            return Response(
                {'error': 'Se requiere el parámetro fecha'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener el lunes de la semana
        lunes = fecha - timedelta(days=fecha.weekday())
        
        packings = Packing.objects.filter(fecha_proyeccion=lunes)
        serializer = PackingSerializer(packings, many=True)
        
        return Response({
            'semana_inicio': lunes,
            'packings': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Obtiene un resumen de kg totales por empresa y tipo de fruta.
        """
        resumen = Packing.objects.values(
            'empresa__nombre',
            'tipo_fruta__nombre'
        ).annotate(
            kg_total=Sum('kg_total')
        ).order_by('empresa__nombre', 'tipo_fruta__nombre')
        
        return Response(resumen)


class PackingDetalleViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Detalles de Packing.
    
    Endpoints disponibles:
        - GET    /api/packing-detalles/          -> Listar detalles
        - POST   /api/packing-detalles/          -> Crear detalle
        - GET    /api/packing-detalles/{id}/     -> Obtener detalle
        - PUT    /api/packing-detalles/{id}/     -> Actualizar detalle
        - DELETE /api/packing-detalles/{id}/     -> Eliminar detalle
    """
    
    queryset = PackingDetalle.objects.all()
    serializer_class = PackingDetalleSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha', 'dia', 'kg']
    ordering = ['fecha']
    
    def get_queryset(self):
        """
        Filtra los detalles por packing.
        """
        queryset = PackingDetalle.objects.all()
        
        packing_id = self.request.query_params.get('packing', None)
        if packing_id:
            queryset = queryset.filter(packing_id=packing_id)
        
        return queryset

