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

from .models import Subasta, Oferta
from modulo_packing.models import PackingSemanal, TipoFruta
from clientes.models import Cliente


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet para el dashboard ejecutivo.
    
    Proporciona estadísticas, gráficos y tablas para el dashboard principal.
    """
    
    # Permitir acceso sin autenticación (ya autenticado en el frontend)
    permission_classes = [AllowAny]
    
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
    
    def _get_periodo_fechas(self, periodo='mes'):
        """
        Calcula las fechas de inicio y fin según el período solicitado.
        
        Args:
            periodo: 'semana', 'mes', o 'año'
            
        Returns:
            tuple: (fecha_inicio, fecha_fin)
        """
        ahora = timezone.now()
        
        if periodo == 'semana':
            fecha_inicio = ahora - timedelta(days=7)
        elif periodo == 'año':
            fecha_inicio = ahora - timedelta(days=365)
        else:  # mes (default)
            fecha_inicio = ahora - timedelta(days=30)
        
        return fecha_inicio, ahora
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        GET /api/subastas/dashboard/estadisticas/?periodo=semana|mes|año
        
        Retorna KPIs principales del dashboard.
        """
        periodo = request.query_params.get('periodo', 'mes')
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
        clientes_activos = Oferta.objects.filter(
            fecha_oferta__gte=fecha_inicio,
            fecha_oferta__lte=fecha_fin
        ).values('cliente').distinct().count()
        
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
        periodo = request.query_params.get('periodo', 'mes')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Agrupar por fecha según el período
        if periodo == 'semana':
            # Agrupar por día
            subastas_por_fecha = Subasta.objects.filter(
                fecha_hora_inicio__gte=fecha_inicio,
                fecha_hora_inicio__lte=fecha_fin
            ).annotate(
                fecha=TruncDate('fecha_hora_inicio')
            ).values('fecha').annotate(
                cantidad=Count('id')
            ).order_by('fecha')
        elif periodo == 'año':
            # Agrupar por mes
            subastas_por_fecha = Subasta.objects.filter(
                fecha_hora_inicio__gte=fecha_inicio,
                fecha_hora_inicio__lte=fecha_fin
            ).annotate(
                fecha=TruncMonth('fecha_hora_inicio')
            ).values('fecha').annotate(
                cantidad=Count('id')
            ).order_by('fecha')
        else:  # mes
            # Agrupar por día
            subastas_por_fecha = Subasta.objects.filter(
                fecha_hora_inicio__gte=fecha_inicio,
                fecha_hora_inicio__lte=fecha_fin
            ).annotate(
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
        periodo = request.query_params.get('periodo', 'mes')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Agrupar por tipo de fruta
        volumenes = Subasta.objects.filter(
            fecha_hora_inicio__gte=fecha_inicio,
            fecha_hora_inicio__lte=fecha_fin
        ).values(
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
        GET /api/subastas/dashboard/estado-packings/
        
        Retorna distribución de estados de PackingSemanal.
        """
        total_packings = PackingSemanal.objects.exclude(estado='ANULADO').count()
        
        # Contar por estado usando el campo estado (no calculado)
        estados = PackingSemanal.objects.exclude(estado='ANULADO').values('estado').annotate(
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
        periodo = request.query_params.get('periodo', 'mes')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Determinar función de truncado
        if periodo == 'año':
            truncate_func = TruncMonth
        else:
            truncate_func = TruncDate
        
        # Obtener subastas finalizadas con su oferta ganadora en el rango
        subastas_finalizadas = Subasta.objects.filter(
            estado='FINALIZADA',
            fecha_hora_fin__gte=fecha_inicio,
            fecha_hora_fin__lte=fecha_fin
        ).annotate(
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
        subastas = Subasta.objects.filter(
            estado='FINALIZADA'
        ).select_related(
            'packing_detalle__packing_tipo__tipo_fruta'
        ).order_by('-fecha_hora_fin')[:5]
        
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
        periodo = request.query_params.get('periodo', 'año')
        fecha_inicio, fecha_fin = self._get_periodo_fechas(periodo)
        
        # Obtener ofertas ganadoras en el período
        ofertas_ganadoras = Oferta.objects.filter(
            es_ganadora=True,
            fecha_oferta__gte=fecha_inicio,
            fecha_oferta__lte=fecha_fin,
            subasta__estado='FINALIZADA'
        ).select_related('cliente')
        
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
                    'subastas_ganadas': 0
                }
            clientes_stats[cliente_id]['total_compras'] += 1
            clientes_stats[cliente_id]['valor_total'] += oferta.monto
            clientes_stats[cliente_id]['subastas_ganadas'] += 1
        
        # Ordenar por valor total y tomar top 10
        top_clientes = sorted(
            clientes_stats.values(),
            key=lambda x: x['valor_total'],
            reverse=True
        )[:10]
        
        # Formatear datos
        datos = [
            {
                'id': item.get('id'), # Asegurar que tenemos el ID
                'cliente_nombre': item['cliente_nombre'],
                'sede': item.get('sede', 'Sin sede'),
                'estatus_ficha': item.get('estatus_ficha', 'pendiente'),
                'total_compras': item['total_compras'],
                'valor_total': float(item['valor_total']), # Lo mantenemos en el JSON por si acaso, pero el frontend no lo mostrará
                'subastas_ganadas': item['subastas_ganadas']
            }
            for item in top_clientes
        ]
        
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
        
        Retorna conteos simplificados por estado para subastas, packings y clientes.
        """
        ahora = timezone.now()
        
        # 1. Resumen de Subastas (basado en estado_calculado lógico)
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
        
        # 2. Resumen de Packings
        # Usamos la propiedad estado_calculado para asegurar consistencia
        all_packings = list(PackingSemanal.objects.all())
        packings_data = {
            'TOTAL': len(all_packings),
            'PROYECTADO': len([p for p in all_packings if p.estado_calculado == 'PROYECTADO']),
            'EN_SUBASTA': len([p for p in all_packings if p.estado_calculado == 'EN_SUBASTA']),
            'FINALIZADO': len([p for p in all_packings if p.estado_calculado == 'FINALIZADO']),
            'ANULADO': len([p for p in all_packings if p.estado_calculado == 'ANULADO']),
        }
        
        # 3. Resumen de Clientes
        clientes = Cliente.objects.all()
        clientes_data = {
            'TOTAL': clientes.count(),
            'ACTIVOS': clientes.filter(estado='habilitado', confirmacion_correo=True).count(),
            'PENDIENTES': clientes.exclude(estado='habilitado', confirmacion_correo=True).count(),
        }
        
        return Response({
            'subastas': subastas_data,
            'packings': packings_data,
            'clientes': clientes_data
        })
