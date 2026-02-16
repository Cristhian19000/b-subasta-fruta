"""
Views para el Módulo de Packing.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count
from django.db.models.deletion import ProtectedError
from usuarios.permissions import RBACPermission, requiere_permiso

from .models import Empresa, TipoFruta, PackingSemanal, PackingTipo, PackingDetalle, PackingImagen
from .serializers import (
    EmpresaSerializer,
    TipoFrutaSerializer,
    PackingSemanalListSerializer,
    PackingSemanalDetailSerializer,
    PackingSemanalCreateSerializer,
    PackingTipoSerializer,
    PackingImagenSerializer,
)


class EmpresaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Empresas."""
    
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = ['catalogos', 'packing', 'subastas']
    
    permisos_mapping = {
        'list': 'view_empresas',
        'retrieve': 'view_empresas',
        'create': 'manage_empresas',
        'update': 'manage_empresas',
        'partial_update': 'manage_empresas',
        'destroy': 'manage_empresas',
    }
    
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
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = ['catalogos', 'packing', 'subastas']
    
    permisos_mapping = {
        'list': 'view_tipos_fruta',
        'retrieve': 'view_tipos_fruta',
        'create': 'manage_tipos_fruta',
        'update': 'manage_tipos_fruta',
        'partial_update': 'manage_tipos_fruta',
        'destroy': 'manage_tipos_fruta',
    }
    
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
    
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = 'packing'
    
    # Mapeo personalizado para acciones fuera del estándar CRUD
    permisos_mapping = {
        'list': 'view_list',
        'retrieve': 'view_detail',
        'create': 'create',
        'update': 'update',
        'partial_update': 'update',
        'destroy': 'delete',
        'cambiar_estado': 'update',
        'resumen': 'view_list',
    }
    
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
    
    def destroy(self, request, *args, **kwargs):
        """
        Eliminar un packing semanal.
        
        Verifica primero si hay subastas asociadas y devuelve un error amigable.
        - Si hay subastas activas (no canceladas), se impide la eliminación.
        - Si solo hay subastas canceladas, requiere confirmación (?confirm=true).
        """
        instance = self.get_object()
        confirm = request.query_params.get('confirm', '').lower() == 'true'
        
        # Verificar si hay subastas asociadas a este packing
        from subastas.models import Subasta
        subastas_qs = Subasta.objects.filter(
            packing_detalle__packing_tipo__packing_semanal=instance
        )
        
        # Contar subastas activas (no canceladas) y canceladas por separado
        subastas_activas = subastas_qs.exclude(estado='CANCELADA')
        subastas_canceladas = subastas_qs.filter(estado='CANCELADA')
        
        activas_count = subastas_activas.count()
        canceladas_count = subastas_canceladas.count()
        
        if activas_count > 0:
            # Hay subastas no canceladas - no permitir eliminación
            return Response(
                {
                    'error': f'No se puede eliminar este packing porque tiene {activas_count} subasta(s) activa(s).',
                    'detail': 'Primero debe cancelar o eliminar las subastas no canceladas antes de eliminar el packing.',
                    'subastas_activas': activas_count,
                    'subastas_canceladas': canceladas_count
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si hay subastas canceladas y no se ha confirmado, pedir confirmación
        if canceladas_count > 0 and not confirm:
            return Response(
                {
                    'requires_confirmation': True,
                    'subastas_canceladas': canceladas_count,
                    'message': f'Este packing tiene {canceladas_count} subasta(s) cancelada(s). ¿Desea eliminarlo de todas formas?'
                },
                status=status.HTTP_409_CONFLICT
            )
        
        try:
            # Si hay subastas canceladas y se confirmó, eliminarlas primero
            if canceladas_count > 0:
                subastas_canceladas.delete()
            
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            # Capturar cualquier otro error de protección no anticipado
            return Response(
                {
                    'error': 'No se puede eliminar este packing porque tiene datos relacionados que lo protegen.',
                    'detail': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
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
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = 'packing'
    
    permisos_mapping = {
        'list': 'view_detail',
        'retrieve': 'view_detail',
    }
    
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


class PackingImagenViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar imágenes de packing.
    
    Soporta:
    - Subir imágenes generales del packing semanal
    - Subir imágenes por tipo de fruta
    - Listar imágenes por packing
    - Eliminar imágenes
    """
    
    queryset = PackingImagen.objects.select_related('packing_semanal', 'packing_tipo__tipo_fruta').all()
    serializer_class = PackingImagenSerializer
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = 'packing'
    
    permisos_mapping = {
        'list': 'view_detail',
        'retrieve': 'view_detail',
        'create': ['create', 'update'],  # Permite subir imágenes con permiso create o update
        'destroy': 'update',
        'subir_multiple': ['create', 'update'],  # Permite subir múltiples imágenes con permiso create o update
    }
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        """Filtrar imágenes por packing o tipo."""
        queryset = super().get_queryset()
        
        # Filtro por packing semanal
        packing_id = self.request.query_params.get('packing', None)
        if packing_id:
            queryset = queryset.filter(packing_semanal_id=packing_id)
        
        # Filtro para imágenes generales (sin tipo) - tiene prioridad
        solo_generales = self.request.query_params.get('generales', None)
        if solo_generales == 'true':
            queryset = queryset.filter(packing_tipo__isnull=True)
            return queryset.order_by('-fecha_subida')
        
        # Filtro por tipo de fruta específico
        tipo_id = self.request.query_params.get('tipo', None)
        if tipo_id:
            queryset = queryset.filter(packing_tipo_id=tipo_id)
        
        return queryset.order_by('-fecha_subida')
    
    def create(self, request, *args, **kwargs):
        """
        Crear una nueva imagen.
        
        Body (form-data):
        - packing_semanal: ID del packing (requerido)
        - packing_tipo: ID del tipo de fruta (opcional)
        - imagen: archivo de imagen (requerido)
        - descripcion: texto descriptivo (opcional)
        """
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='subir-multiple')
    def subir_multiple(self, request):
        """
        Subir múltiples imágenes a la vez.
        
        Body (form-data):
        - packing_semanal: ID del packing (requerido)
        - packing_tipo: ID del tipo de fruta (opcional)
        - imagenes: array de archivos de imagen
        """
        packing_id = request.data.get('packing_semanal')
        tipo_id = request.data.get('packing_tipo', None)
        imagenes = request.FILES.getlist('imagenes')
        
        if not packing_id:
            return Response(
                {'error': 'Debe proporcionar el ID del packing semanal'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not imagenes:
            return Response(
                {'error': 'Debe proporcionar al menos una imagen'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que el packing existe
        try:
            packing = PackingSemanal.objects.get(pk=packing_id)
        except PackingSemanal.DoesNotExist:
            return Response(
                {'error': 'Packing semanal no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar tipo si se proporciona
        packing_tipo = None
        if tipo_id:
            try:
                packing_tipo = PackingTipo.objects.get(pk=tipo_id, packing_semanal=packing)
            except PackingTipo.DoesNotExist:
                return Response(
                    {'error': 'Tipo de fruta no encontrado o no pertenece a este packing'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Crear todas las imágenes
        imagenes_creadas = []
        for imagen in imagenes:
            imagen_obj = PackingImagen.objects.create(
                packing_semanal=packing,
                packing_tipo=packing_tipo,
                imagen=imagen,
                descripcion=request.data.get('descripcion', '')
            )
            imagenes_creadas.append(imagen_obj)
        
        serializer = PackingImagenSerializer(
            imagenes_creadas, 
            many=True,
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

