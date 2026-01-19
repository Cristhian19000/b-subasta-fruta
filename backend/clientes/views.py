"""
Vistas (Views) para la API de Clientes.

Este módulo contiene el ViewSet que maneja todas las operaciones
CRUD (Crear, Leer, Actualizar, Eliminar) para el modelo Cliente,
además de acciones personalizadas para confirmar correo y cambiar estados.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Cliente
from .serializers import ClienteSerializer, ClienteListSerializer, ClienteLoginSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Clientes.
    
    Proporciona operaciones CRUD completas y acciones personalizadas.
    
    Endpoints disponibles:
        - GET    /api/clientes/          -> Listar todos los clientes
        - POST   /api/clientes/          -> Crear un nuevo cliente
        - GET    /api/clientes/{id}/     -> Obtener un cliente específico
        - PUT    /api/clientes/{id}/     -> Actualizar un cliente completo
        - PATCH  /api/clientes/{id}/     -> Actualizar parcialmente un cliente
        - DELETE /api/clientes/{id}/     -> Eliminar un cliente
    
    Acciones personalizadas:
        - POST  /api/clientes/{id}/confirmar_correo/       -> Confirmar email
        - PATCH /api/clientes/{id}/cambiar_estado/         -> Cambiar estado
        - PATCH /api/clientes/{id}/actualizar_estatus_ficha/ -> Actualizar ficha
    
    Filtros disponibles:
        - ?search=texto  -> Buscar por RUC/DNI, nombre, contacto o sede
        - ?ordering=campo -> Ordenar por nombre, fecha_creacion o estado
    """
    
    # Consulta base: todos los clientes
    queryset = Cliente.objects.all()
    
    # Serializer por defecto para operaciones de detalle
    serializer_class = ClienteSerializer
    
    # Backends de filtrado: búsqueda y ordenamiento
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    
    # Campos habilitados para búsqueda con ?search=
    search_fields = ['ruc_dni', 'nombre_razon_social', 'contacto_1', 'sede']
    
    # Campos habilitados para ordenamiento con ?ordering=
    ordering_fields = ['nombre_razon_social', 'fecha_creacion', 'estado']
    
    # Ordenamiento por defecto: más recientes primero
    ordering = ['-fecha_creacion']
    
    def get_serializer_class(self):
        """
        Selecciona el serializer apropiado según la acción.
        
        Retorna:
            - ClienteListSerializer para listados (campos reducidos)
            - ClienteSerializer para otras operaciones (todos los campos)
        """
        if self.action == 'list':
            return ClienteListSerializer
        return ClienteSerializer
    
    # =========================================================================
    # ACCIONES PERSONALIZADAS
    # Endpoints adicionales para operaciones específicas
    # =========================================================================
    
    @action(detail=True, methods=['post'])
    def confirmar_correo(self, request, pk=None):
        """
        Confirma el correo electrónico de un cliente.
        
        Endpoint: POST /api/clientes/{id}/confirmar_correo/
        
        Actualiza el campo confirmacion_correo a True.
        """
        cliente = self.get_object()
        cliente.confirmacion_correo = True
        cliente.save()
        return Response({
            'message': 'Correo confirmado exitosamente',
            'cliente': ClienteSerializer(cliente).data
        })
    
    @action(detail=True, methods=['patch'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambia el estado de un cliente.
        
        Endpoint: PATCH /api/clientes/{id}/cambiar_estado/
        
        Body esperado: { "estado": "activo" | "inactivo" | "pendiente" }
        
        Valida que el estado proporcionado sea válido antes de actualizar.
        """
        cliente = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        # Validar que el estado sea uno de los permitidos
        if nuevo_estado not in dict(Cliente.ESTADO_CHOICES):
            return Response(
                {'error': 'Estado inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cliente.estado = nuevo_estado
        cliente.save()
        return Response({
            'message': f'Estado cambiado a {nuevo_estado}',
            'cliente': ClienteSerializer(cliente).data
        })
    
    @action(detail=True, methods=['patch'])
    def actualizar_estatus_ficha(self, request, pk=None):
        """
        Actualiza el estatus de la ficha de un cliente.
        
        Endpoint: PATCH /api/clientes/{id}/actualizar_estatus_ficha/
        
        Body esperado: { "estatus_ficha": "completa" | "incompleta" | "en_revision" }
        
        Valida que el estatus proporcionado sea válido antes de actualizar.
        """
        cliente = self.get_object()
        nuevo_estatus = request.data.get('estatus_ficha')
        
        # Validar que el estatus de ficha sea uno de los permitidos
        if nuevo_estatus not in dict(Cliente.ESTATUS_FICHA_CHOICES):
            return Response(
                {'error': 'Estatus de ficha inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cliente.estatus_ficha = nuevo_estatus
        cliente.save()
        return Response({
            'message': f'Estatus de ficha actualizado a {nuevo_estatus}',
            'cliente': ClienteSerializer(cliente).data
        })

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtiene estadísticas generales de los clientes.
        
        Endpoint: GET /api/clientes/estadisticas/
        
        Retorna:
            - total_clientes: Total de clientes en el sistema
            - clientes_habilitados: Clientes con estado 'habilitado'
            - clientes_deshabilitados: Clientes con estado 'deshabilitado'
            - fichas_pendientes: Clientes con estatus_ficha 'pendiente'
            - fichas_recepcionadas: Clientes con estatus_ficha 'recepcionado'
            - correos_confirmados: Clientes con correo confirmado
            - correos_pendientes: Clientes sin correo confirmado
        """
        from django.db.models import Count, Q
        
        total = Cliente.objects.count()
        habilitados = Cliente.objects.filter(estado='habilitado').count()
        deshabilitados = Cliente.objects.filter(estado='deshabilitado').count()
        fichas_pendientes = Cliente.objects.filter(estatus_ficha='pendiente').count()
        fichas_recepcionadas = Cliente.objects.filter(estatus_ficha='recepcionado').count()
        correos_confirmados = Cliente.objects.filter(confirmacion_correo=True).count()
        correos_pendientes = Cliente.objects.filter(confirmacion_correo=False).count()
        
        return Response({
            'total_clientes': total,
            'clientes_habilitados': habilitados,
            'clientes_deshabilitados': deshabilitados,
            'fichas_pendientes': fichas_pendientes,
            'fichas_recepcionadas': fichas_recepcionadas,
            'correos_confirmados': correos_confirmados,
            'correos_pendientes': correos_pendientes,
        })

     # =========================================================================
    # ACCIÓN PARA GESTIÓN DE CREDENCIALES
    # =========================================================================

    @action(detail=True, methods=['patch'])
    def resetear_password(self, request, pk=None):
        """
        Permite al administrador asignar una nueva contraseña a un cliente.
        
        Endpoint: PATCH /api/clientes/{id}/resetear_password/
        Body: { "password": "nueva_clave_123" }
        """
        cliente = self.get_object()
        nueva_password = request.data.get('password')

        if not nueva_password:
            return Response(
                {'error': 'Debe proporcionar una nueva contraseña.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Usamos el serializer para aprovechar la lógica de encriptación (make_password)
        # que ya definimos en el método update del serializer.
        serializer = ClienteSerializer(cliente, data={'password': nueva_password}, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Contraseña actualizada correctamente.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # =========================================================================
    # ENDPOINT PARA APP MÓVIL (KOTLIN)
    # =========================================================================

    @action(detail=False, methods=['post'], url_path='login-movil')
    def login_movil(self, request):
        """
        Endpoint para el inicio de sesión de clientes desde la aplicación móvil.
        
        Ruta: POST /api/clientes/login-movil/
        Body: { "ruc_dni": "12345678", "password": "..." }
        
        Retorna:
            - message: Mensaje de éxito
            - token: JWT access token
            - refresh_token: JWT refresh token para renovar el access token
            - cliente: Datos del cliente autenticado
        """
        serializer = ClienteLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            cliente = serializer.validated_data['cliente']
            
            # Generar tokens JWT para el cliente
            # Usamos el ID del cliente como identificador en el token
            refresh = RefreshToken()
            refresh['cliente_id'] = cliente.id
            refresh['ruc_dni'] = cliente.ruc_dni
            
            return Response({
                'message': 'Login exitoso',
                'token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'cliente': {
                    'id': cliente.id,
                    'ruc_dni': cliente.ruc_dni,
                    'nombre': cliente.nombre_razon_social,
                    'nombre_razon_social': cliente.nombre_razon_social,
                    'sede': cliente.sede,
                    'contacto_1': cliente.contacto_1,
                    'cargo_1': cliente.cargo_1,
                    'numero_1': cliente.numero_1,
                    'correo_electronico_1': cliente.correo_electronico_1,
                    'contacto_2': cliente.contacto_2,
                    'cargo_2': cliente.cargo_2,
                    'numero_2': cliente.numero_2,
                    'correo_electronico_2': cliente.correo_electronico_2,
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='perfil')
    def perfil(self, request):
        """
        Obtiene el perfil del cliente autenticado.
        
        Ruta: GET /api/clientes/perfil/
        Headers: Authorization: Bearer <token>
        
        Retorna los datos del cliente basándose en el cliente_id del token JWT.
        """
        # Obtener el cliente_id del token JWT
        cliente_id = request.auth.get('cliente_id') if request.auth else None
        
        if not cliente_id:
            return Response(
                {'error': 'Token inválido o no proporcionado'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            cliente = Cliente.objects.get(id=cliente_id)
        except Cliente.DoesNotExist:
            return Response(
                {'error': 'Cliente no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que el cliente sigue habilitado
        if cliente.estado != 'habilitado':
            return Response(
                {'error': 'Esta cuenta está deshabilitada'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response({
            'id': cliente.id,
            'ruc_dni': cliente.ruc_dni,
            'nombre': cliente.nombre_razon_social,
            'nombre_razon_social': cliente.nombre_razon_social,
            'sede': cliente.sede,
            'contacto_1': cliente.contacto_1,
            'cargo_1': cliente.cargo_1,
            'numero_1': cliente.numero_1,
            'correo_electronico_1': cliente.correo_electronico_1,
            'contacto_2': cliente.contacto_2,
            'cargo_2': cliente.cargo_2,
            'numero_2': cliente.numero_2,
            'correo_electronico_2': cliente.correo_electronico_2,
        }, status=status.HTTP_200_OK)
