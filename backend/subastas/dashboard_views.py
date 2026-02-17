"""
Dashboard Views - Estadísticas y métricas para el dashboard ejecutivo.

Proporciona 8 endpoints para visualizar KPIs, tendencias, gráficos y rankings.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Count, Max, Q, F, DecimalField
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
from usuarios.permissions import RBACPermission

from .models import Subasta, Oferta
from modulo_packing.models import PackingSemanal, TipoFruta
from clientes.models import Cliente


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet para el dashboard ejecutivo.
    
    Proporciona estadísticas, gráficos y tablas para el dashboard principal.
    """
    
    permission_classes = [IsAuthenticated, RBACPermission]
    modulo_permiso = 'dashboard'
    
    permisos_mapping = {
        # Base
        'list': 'view_dashboard',
        
        # Gráficos de Resumen (donut charts)
        'resumen': 'view_summary',
        
        # Tablas
        'subastas_recientes': 'view_tables',
        'top_clientes': 'view_tables',
        
        # Reportes y Estadísticas
        'estadisticas': 'view_reports',
        'tendencia_subastas': 'view_reports',
        'volumen_por_fruta': 'view_reports',
        'estado_packings': 'view_reports',
        'ingresos_periodo': 'view_reports',
        'proximas_subastas': 'view_reports',
    }
    
    def list(self, request):
        """
        Endpoint base que lista los endpoints disponibles del dashboard.
        """
        return Response({
            'message': 'Dashboard API',
            'endpoints': [
                '/estadisticas/',
                '/tendencia-subastas/',
                '/volumen-por-fruta/',
                '/estado-packings/',
                '/ingresos-periodo/',
                '/subastas-recientes/',
                '/top-clientes/',
                '/proximas-subastas/',
                '/resumen/',
            ]
        })
    
    def _get_periodo_fechas(self, periodo='1m'):
        """
        Calcula las fechas de inicio y fin según el período solicitado.
        
        Args:
            periodo: 'semana', '1m', '2m', '3m', '6m', 'año', 'todo'
            
        Returns:
            tuple: (fecha_inicio, fecha_fin) o (None, None) para 'todo'
        """
        ahora = timezone.now()
        
        if periodo == 'semana':
            fecha_inicio = ahora - timedelta(days=7)
        elif periodo == '1m':
            fecha_inicio = ahora - timedelta(days=30)
        elif periodo == '2m':
            fecha_inicio = ahora - timedelta(days=60)
        elif periodo == '3m':
            fecha_inicio = ahora - timedelta(days=90)
        elif periodo == '6m':
            fecha_inicio = ahora - timedelta(days=180)
        elif periodo == 'año':
            fecha_inicio = ahora - timedelta(days=365)
        elif periodo == 'todo':
            return None, None
        else:  # default 1m
            fecha_inicio = ahora - timedelta(days=30)
        
        return fecha_inicio, ahora
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        GET /api/subastas/dashboard/estadisticas/?periodo=semana|mes|año
        
        Retorna KPIs principales del dashboard.
        """
        periodo = request.query_params.get('periodo', '1m')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # KPI 1: Subastas activas AHORA (ignorar período)
        ahora = timezone.now()
        subastas_activas = Subasta.objects.filter(
            fecha_hora_inicio__lte=ahora,
            fecha_hora_fin__gte=ahora,
            estado='ACTIVA'
        ).exclude(estado='CANCELADA')
        
        subastas_activas_count = subastas_activas.count()
        
        # KPI 2: Volumen total en kg de subastas activas
        volumen_total_kg = subastas_activas.aggregate(
            total=Sum('packing_detalle__py')
        )['total'] or 0
        
        # KPI 3: Valor total (suma de ofertas ganadoras actuales)
        valor_total = Decimal('0')
        for subasta in subastas_activas:
            oferta_ganadora = subasta.oferta_ganadora
            if oferta_ganadora:
                valor_total += oferta_ganadora.monto
        
        # KPI 4: Clientes activos (que han pujado en el período)
        clientes_activos_qs = Oferta.objects.all()
        if fecha_inicio and fecha_fin:
            clientes_activos_qs = clientes_activos_qs.filter(
                fecha_oferta__gte=fecha_inicio,
                fecha_oferta__lte=fecha_fin
            )
        clientes_activos = clientes_activos_qs.values('cliente').distinct().count()
        
        return Response({
            'subastas_activas': subastas_activas_count,
            'volumen_total_kg': float(volumen_total_kg),
            'valor_total': float(valor_total),
            'clientes_activos': clientes_activos,
        })
    
    @action(detail=False, methods=['get'], url_path='tendencia-subastas')
    def tendencia_subastas(self, request):
        """
        GET /api/subastas/dashboard/tendencia-subastas/?periodo=semana|mes|año
        
        Retorna datos para gráfico de línea con tendencia de subastas.
        """
        periodo = request.query_params.get('periodo', '1m')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Agrupar por fecha según el período
        queryset = Subasta.objects.all()
        if fecha_inicio and fecha_fin:
            queryset = queryset.filter(
                fecha_hora_inicio__gte=fecha_inicio,
                fecha_hora_inicio__lte=fecha_fin
            )

        if periodo == 'semana':
            # Agrupar por día
            subastas_por_fecha = queryset.annotate(
                fecha=TruncDate('fecha_hora_inicio')
            ).values('fecha').annotate(
                cantidad=Count('id')
            ).order_by('fecha')
        elif periodo == 'año':
            # Agrupar por mes
            subastas_por_fecha = queryset.annotate(
                fecha=TruncMonth('fecha_hora_inicio')
            ).values('fecha').annotate(
                cantidad=Count('id')
            ).order_by('fecha')
        else:  # 1m o todo
            # Agrupar por día
            subastas_por_fecha = queryset.annotate(
                fecha=TruncDate('fecha_hora_inicio')
            ).values('fecha').annotate(
                cantidad=Count('id')
            ).order_by('fecha')
        
        # Formatear datos
        datos = [
            {
                'fecha': item['fecha'].strftime('%Y-%m-%d') if item['fecha'] else None,
                'cantidad': item['cantidad']
            }
            for item in subastas_por_fecha
        ]
        
        return Response(datos)
    
    @action(detail=False, methods=['get'], url_path='volumen-por-fruta')
    def volumen_por_fruta(self, request):
        """
        GET /api/subastas/dashboard/volumen-por-fruta/?periodo=mes
        
        Retorna top 5 frutas más subastadas por volumen.
        """
        periodo = request.query_params.get('periodo', '1m')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Agrupar por tipo de fruta
        queryset = Subasta.objects.all()
        if fecha_inicio and fecha_fin:
            queryset = queryset.filter(
                fecha_hora_inicio__gte=fecha_inicio,
                fecha_hora_inicio__lte=fecha_fin
            )

        volumenes = queryset.values(
            'packing_detalle__packing_tipo__tipo_fruta__nombre'
        ).annotate(
            kg_total=Sum('packing_detalle__py')
        ).order_by('-kg_total')[:5]
        
        # Colores para cada fruta (puedes personalizar)
        colores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        
        datos = [
            {
                'tipo_fruta': item['packing_detalle__packing_tipo__tipo_fruta__nombre'] or 'Sin tipo',
                'kg_total': float(item['kg_total'] or 0),
                'color': colores[i] if i < len(colores) else '#6b7280'
            }
            for i, item in enumerate(volumenes)
        ]
        
        return Response(datos)
    
    @action(detail=False, methods=['get'], url_path='estado-packings')
    def estado_packings(self, request):
        """
        GET /api/subastas/dashboard/estado-packings/?periodo=1m
        
        Retorna distribución de estados de PackingSemanal.
        """
        periodo = request.query_params.get('periodo', '1m')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        packings_qs = PackingSemanal.objects.exclude(estado='ANULADO')
        if fecha_inicio and fecha_fin:
            # fecha_inicio_semana es DateField
            packings_qs = packings_qs.filter(
                fecha_inicio_semana__gte=fecha_inicio.date(),
                fecha_inicio_semana__lte=fecha_fin.date()
            )
            
        total_packings = packings_qs.count()
        
        # Contar por estado usando el campo estado (no calculado)
        estados = packings_qs.values('estado').annotate(
            cantidad=Count('id')
        )
        
        datos = []
        for item in estados:
            cantidad = item['cantidad']
            porcentaje = (cantidad / total_packings * 100) if total_packings > 0 else 0
            datos.append({
                'estado': item['estado'],
                'cantidad': cantidad,
                'porcentaje': round(porcentaje, 1)
            })
        
        return Response(datos)
    
    @action(detail=False, methods=['get'], url_path='ingresos-periodo')
    def ingresos_periodo(self, request):
        """
        GET /api/subastas/dashboard/ingresos-periodo/?periodo=semana|mes|año
        
        Retorna datos de ingresos para gráfico de área.
        """
        periodo = request.query_params.get('periodo', '1m')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Determinar función de truncado
        if periodo == 'año':
            truncate_func = TruncMonth
        else:
            truncate_func = TruncDate
        
        # Obtener subastas finalizadas con su oferta ganadora en el rango
        queryset = Subasta.objects.filter(estado='FINALIZADA')
        if fecha_inicio and fecha_fin:
            queryset = queryset.filter(
                fecha_hora_fin__gte=fecha_inicio,
                fecha_hora_fin__lte=fecha_fin
            )

        subastas_finalizadas = queryset.annotate(
            periodo_label=truncate_func('fecha_hora_fin')
        )
        
        # Calcular ingresos por período
        ingresos_por_periodo = {}
        for subasta in subastas_finalizadas:
            oferta_ganadora = subasta.oferta_ganadora
            if oferta_ganadora:
                periodo_key = subasta.periodo_label
                if periodo_key not in ingresos_por_periodo:
                    ingresos_por_periodo[periodo_key] = Decimal('0')
                ingresos_por_periodo[periodo_key] += oferta_ganadora.monto
        
        # Formatear datos
        datos = [
            {
                'periodo': periodo_key.strftime('%Y-%m-%d') if isinstance(periodo_key, (datetime, timezone.datetime)) else str(periodo_key),
                'ingresos': float(monto)
            }
            for periodo_key, monto in sorted(ingresos_por_periodo.items())
        ]
        
        return Response(datos)
    
    @action(detail=False, methods=['get'], url_path='subastas-recientes')
    def subastas_recientes(self, request):
        """
        GET /api/subastas/dashboard/subastas-recientes/
        
        Retorna últimas 5 subastas finalizadas.
        """
        ahora = timezone.now()
        
        # Siempre mostramos las últimas 10, sin importar el filtro
        subastas = Subasta.objects.filter(
            fecha_hora_fin__lt=ahora
        ).exclude(estado='CANCELADA').select_related(
            'packing_detalle__packing_tipo__tipo_fruta'
        ).order_by('-fecha_hora_fin')[:10]
        
        datos = []
        for subasta in subastas:
            oferta_ganadora = subasta.oferta_ganadora
            datos.append({
                'id': subasta.id,
                'tipo_fruta': subasta.tipo_fruta.nombre if subasta.tipo_fruta else 'Sin tipo',
                'kg': float(subasta.kilos_totales),
                'precio_final': float(oferta_ganadora.monto) if oferta_ganadora else float(subasta.precio_base),
                'ganador': oferta_ganadora.cliente.nombre_razon_social if oferta_ganadora else 'Sin ofertas',
                'fecha_fin': subasta.fecha_hora_fin.isoformat(),
                'fecha_produccion': subasta.packing_detalle.fecha.strftime('%d/%m/%Y'),
                'dia_produccion': subasta.packing_detalle.get_dia_display()
            })
        
        return Response(datos)
    
    @action(detail=False, methods=['get'], url_path='top-clientes')
    def top_clientes(self, request):
        """
        GET /api/subastas/dashboard/top-clientes/?periodo=mes|año
        
        Retorna ranking de top 10 clientes.
        """
        periodo = request.query_params.get('periodo', '1m')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Obtener ofertas ganadoras en el período
        # Se consideran subastas cuya fecha de fin ya pasó y no están canceladas
        ahora = timezone.now()
        queryset = Oferta.objects.filter(
            es_ganadora=True,
            subasta__fecha_hora_fin__lt=ahora
        ).exclude(subasta__estado='CANCELADA')

        if fecha_inicio and fecha_fin:
            queryset = queryset.filter(
                fecha_oferta__gte=fecha_inicio,
                fecha_oferta__lte=fecha_fin
            )
        
        ofertas_ganadoras = queryset.select_related('cliente', 'subasta')
        
        
        # Agrupar por cliente
        clientes_stats = {}
        for oferta in ofertas_ganadoras:
            cliente_id = oferta.cliente.id
            if cliente_id not in clientes_stats:
                clientes_stats[cliente_id] = {
                    'id': cliente_id,
                    'cliente_nombre': oferta.cliente.nombre_razon_social,
                    'sede': oferta.cliente.sede,
                    'estatus_ficha': oferta.cliente.estatus_ficha,
                    'total_compras': 0,
                    'valor_total': Decimal('0'),
                    'subastas_ganadas': 0,
                    'montos': []  # Lista para calcular min/avg/max
                }
            clientes_stats[cliente_id]['total_compras'] += 1
            clientes_stats[cliente_id]['valor_total'] += oferta.monto
            clientes_stats[cliente_id]['subastas_ganadas'] += 1
            clientes_stats[cliente_id]['montos'].append(oferta.monto)
        
        # Ordenar por valor total y tomar top 10
        top_clientes = sorted(
            clientes_stats.values(),
            key=lambda x: x['valor_total'],
            reverse=True
        )[:10]
        
        # Formatear datos con métricas estadísticas
        datos = []
        for item in top_clientes:
            montos = item['montos']
            datos.append({
                'id': item.get('id'),
                'cliente_nombre': item['cliente_nombre'],
                'sede': item.get('sede', 'Sin sede'),
                'estatus_ficha': item.get('estatus_ficha', 'pendiente'),
                'total_compras': item['total_compras'],
                'valor_total': float(item['valor_total']),
                'subastas_ganadas': item['subastas_ganadas'],
                # Métricas estadísticas para box plot y tabla
                'monto_minimo': float(min(montos)) if montos else 0,
                'monto_promedio': float(sum(montos) / len(montos)) if montos else 0,
                'monto_maximo': float(max(montos)) if montos else 0,
                'montos_lista': [float(m) for m in montos]
            })
        
        return Response(datos)
    
    @action(detail=False, methods=['get'], url_path='proximas-subastas')
    def proximas_subastas(self, request):
        """
        GET /api/subastas/dashboard/proximas-subastas/
        
        Retorna próximas 5 subastas programadas.
        """
        ahora = timezone.now()
        
        subastas = Subasta.objects.filter(
            fecha_hora_inicio__gt=ahora,
            estado='PROGRAMADA'
        ).select_related(
            'packing_detalle__packing_tipo__tipo_fruta'
        ).order_by('fecha_hora_inicio')[:5]
        
        datos = []
        for subasta in subastas:
            datos.append({
                'id': subasta.id,
                'tipo_fruta': subasta.tipo_fruta.nombre if subasta.tipo_fruta else 'Sin tipo',
                'kg': float(subasta.kilos_totales),
                'precio_base': float(subasta.precio_base),
                'fecha_inicio': subasta.fecha_hora_inicio.isoformat()
            })
        
        return Response(datos)
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        GET /api/subastas/dashboard/resumen/
        
        Retorna conteos simplificados GLOBALES (ignora filtro de periodo para coherencia visual).
        """
        ahora = timezone.now()
        
        # 1. Resumen de Subastas (GLOBAL)
        subastas = Subasta.objects.all()
        
        # Nota: Como estado_calculado es una propiedad, no podemos filtrar directamente en BD
        # Pero podemos aproximar con lógica de fechas o procesar en Python si son pocas
        subastas_data = {
            'TOTAL': subastas.count(),
            'PROGRAMADA': subastas.filter(fecha_hora_inicio__gt=ahora).exclude(estado='CANCELADA').count(),
            'ACTIVA': subastas.filter(fecha_hora_inicio__lte=ahora, fecha_hora_fin__gte=ahora).exclude(estado='CANCELADA').count(),
            'FINALIZADA': subastas.filter(fecha_hora_fin__lt=ahora).exclude(estado='CANCELADA').count(),
            'CANCELADA': subastas.filter(estado='CANCELADA').count(),
        }
        
        # 2. Resumen de Packings (GLOBAL)
        all_packings = list(PackingSemanal.objects.all())
        packings_data = {
            'TOTAL': len(all_packings),
            'PROYECTADO': len([p for p in all_packings if p.estado_calculado == 'PROYECTADO']),
            'EN_SUBASTA': len([p for p in all_packings if p.estado_calculado == 'EN_SUBASTA']),
            'FINALIZADO': len([p for p in all_packings if p.estado_calculado == 'FINALIZADO']),
            'ANULADO': len([p for p in all_packings if p.estado_calculado == 'ANULADO']),
        }
        
        # 3. Resumen de Clientes (GLOBAL)
        clientes_qs = Cliente.objects.all()
        
        clientes_data = {
            'TOTAL': clientes_qs.count(),
            'ACTIVOS': clientes_qs.filter(estado='habilitado', confirmacion_correo=True).count(),
            'PENDIENTES': clientes_qs.exclude(estado='habilitado', confirmacion_correo=True).count(),
        }
        
        return Response({
            'subastas': subastas_data,
            'packings': packings_data,
            'clientes': clientes_data
        })
