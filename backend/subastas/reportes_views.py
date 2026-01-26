"""
Views para Reportes de Subastas.

Genera reportes profesionales en formato Excel con información completa
de las subastas: empresa, tipo de fruta, ganador, ofertas, etc.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Count, Max, Min
from django.utils import timezone
from datetime import datetime
import pytz
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from .models import Subasta, Oferta
from clientes.models import Cliente
from modulo_packing.models import PackingSemanal, PackingDetalle


class ReporteSubastasViewSet(viewsets.ViewSet):
    """
    ViewSet para generar reportes de subastas.
    
    Endpoints:
    - GET /api/admin/reportes/subastas/excel/ - Generar reporte Excel
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def excel(self, request):
        """
        Genera un reporte Excel profesional de subastas.
        
        Parámetros query:
        - fecha_inicio: Fecha de inicio del rango (formato: YYYY-MM-DD)
        - fecha_fin: Fecha de fin del rango (formato: YYYY-MM-DD)
        
        Retorna: Archivo Excel descargable
        """
        # Obtener parámetros de filtro
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        
        # Construir queryset base con todas las relaciones necesarias
        queryset = Subasta.objects.select_related(
            'packing_detalle',
            'packing_detalle__packing_tipo',
            'packing_detalle__packing_tipo__tipo_fruta',
            'packing_detalle__packing_tipo__packing_semanal',
            'packing_detalle__packing_tipo__packing_semanal__empresa',
        ).prefetch_related('ofertas', 'ofertas__cliente').order_by(
            '-packing_detalle__packing_tipo__packing_semanal__fecha_inicio_semana',  # Semana descendente (más recientes primero)
            'packing_detalle__fecha',  # Día ascendente (Lunes → Sábado)
            'packing_detalle__packing_tipo__tipo_fruta__nombre'  # Tipo de fruta alfabéticamente
        )
        
        # Aplicar filtros de fecha si se proporcionan
        if fecha_inicio_str:
            try:
                fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_hora_inicio__date__gte=fecha_inicio)
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha_inicio inválido. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if fecha_fin_str:
            try:
                fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_hora_inicio__date__lte=fecha_fin)
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha_fin inválido. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Generar el archivo Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "Reporte de Subastas"
        
        # =====================================================================
        # ESTILOS
        # =====================================================================
        
        # Estilo del título
        titulo_font = Font(name='Calibri', size=16, bold=True, color='FFFFFF')
        titulo_fill = PatternFill(start_color='1F4788', end_color='1F4788', fill_type='solid')
        titulo_alignment = Alignment(horizontal='center', vertical='center')
        
        # Estilo del encabezado de columnas
        header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        # Estilo de las celdas de datos
        cell_font = Font(name='Calibri', size=10)
        cell_alignment = Alignment(horizontal='left', vertical='center')
        cell_border = Border(
            left=Side(style='thin', color='D3D3D3'),
            right=Side(style='thin', color='D3D3D3'),
            top=Side(style='thin', color='D3D3D3'),
            bottom=Side(style='thin', color='D3D3D3')
        )
        
        # =====================================================================
        # TÍTULO DEL REPORTE
        # =====================================================================
        
        ws.merge_cells('A1:N1')
        cell_titulo = ws['A1']
        
        # Crear texto del título con rango de fechas
        titulo_texto = "REPORTE DE SUBASTAS"
        if fecha_inicio_str or fecha_fin_str:
            if fecha_inicio_str and fecha_fin_str:
                titulo_texto += f" - Del {fecha_inicio_str} al {fecha_fin_str}"
            elif fecha_inicio_str:
                titulo_texto += f" - Desde {fecha_inicio_str}"
            else:
                titulo_texto += f" - Hasta {fecha_fin_str}"
        
        cell_titulo.value = titulo_texto
        cell_titulo.font = titulo_font
        cell_titulo.fill = titulo_fill
        cell_titulo.alignment = titulo_alignment
        ws.row_dimensions[1].height = 30
        
        # =====================================================================
        # ENCABEZADOS DE COLUMNAS
        # =====================================================================
        
        headers = [
            'ID Subasta',
            'Empresa',
            'Semana',
            'Día',
            'Fecha Producción',
            'Tipo Fruta',
            'Kilos',
            'Estado',
            'Fecha Inicio',
            'Fecha Fin',
            'Precio Base',
            'Ganador',
            'Monto Ganador',
            'Total Ofertas'
        ]
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = cell_border
        
        ws.row_dimensions[2].height = 35
        
        # =====================================================================
        # DATOS DE SUBASTAS
        # =====================================================================
        
        row_num = 3
        for subasta in queryset:
            # Obtener información de la oferta ganadora
            oferta_ganadora = subasta.oferta_ganadora
            ganador_nombre = oferta_ganadora.cliente.nombre_razon_social if oferta_ganadora else 'Sin ofertas'
            monto_ganador = float(oferta_ganadora.monto) if oferta_ganadora else 0.0
            
            # Contar ofertas totales
            total_ofertas = subasta.ofertas.count()
            
            # Obtener datos del packing
            detalle = subasta.packing_detalle
            packing_tipo = detalle.packing_tipo
            packing_semanal = packing_tipo.packing_semanal
            
            # Convertir horarios UTC a zona horaria de Perú (America/Lima, UTC-5)
            lima_tz = pytz.timezone('America/Lima')
            fecha_inicio_peru = subasta.fecha_hora_inicio.astimezone(lima_tz)
            fecha_fin_peru = subasta.fecha_hora_fin.astimezone(lima_tz)
            
            # Datos de la fila
            row_data = [
                subasta.id,
                packing_semanal.empresa.nombre,
                f"{packing_semanal.fecha_inicio_semana.strftime('%d/%m/%Y')} - {packing_semanal.fecha_fin_semana.strftime('%d/%m/%Y')}",
                detalle.get_dia_display(),
                detalle.fecha.strftime('%d/%m/%Y'),
                packing_tipo.tipo_fruta.nombre,
                float(detalle.py),
                subasta.get_estado_display(),
                fecha_inicio_peru.strftime('%d/%m/%Y %H:%M'),  # Horario de Perú
                fecha_fin_peru.strftime('%d/%m/%Y %H:%M'),      # Horario de Perú
                float(subasta.precio_base),
                ganador_nombre,
                monto_ganador,
                total_ofertas
            ]
            
            # Escribir la fila
            for col_num, value in enumerate(row_data, 1):
                cell = ws.cell(row=row_num, column=col_num)
                cell.value = value
                cell.font = cell_font
                cell.alignment = cell_alignment
                cell.border = cell_border
                
                # Formato especial para números
                if col_num in [7, 11, 13]:  # Kilos, Precio Base, Monto Ganador
                    cell.number_format = '#,##0.00'
            
            row_num += 1
        
        # =====================================================================
        # AJUSTAR ANCHOS DE COLUMNAS
        # =====================================================================
        
        column_widths = {
            'A': 12,  # ID Subasta
            'B': 25,  # Empresa
            'C': 25,  # Semana
            'D': 12,  # Día
            'E': 18,  # Fecha Producción
            'F': 20,  # Tipo Fruta
            'G': 12,  # Kilos
            'H': 15,  # Estado
            'I': 18,  # Fecha Inicio
            'J': 18,  # Fecha Fin
            'K': 14,  # Precio Base
            'L': 30,  # Ganador
            'M': 15,  # Monto Ganador
            'N': 14,  # Total Ofertas
        }
        
        for col_letter, width in column_widths.items():
            ws.column_dimensions[col_letter].width = width
        
        # =====================================================================
        # AGREGAR FILTROS AUTOMÁTICOS
        # =====================================================================
        
        if row_num > 3:  # Solo si hay datos
            ws.auto_filter.ref = f"A2:N{row_num-1}"
        
        # =====================================================================
        # GENERAR RESPUESTA HTTP CON EL ARCHIVO
        # =====================================================================
        
        # Crear nombre de archivo con timestamp
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reporte_subastas_{timestamp}.xlsx"
        
        # Preparar la respuesta HTTP
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        # Guardar el workbook en la respuesta
        wb.save(response)
        
        return response
    
    @action(detail=False, methods=['get'])
    def clientes_excel(self, request):
        """
        Genera un reporte Excel profesional de clientes.
        
        Incluye información completa del cliente y estadísticas de participación.
        
        Retorna: Archivo Excel descargable
        """
        from django.db.models import Count, Sum, Q
        
        # Obtener todos los clientes con sus estadísticas
        clientes = Cliente.objects.all().order_by('nombre_razon_social')
        
        # Generar el archivo Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "Reporte de Clientes"
        
        # =====================================================================
        # ESTILOS
        # =====================================================================
        
        # Estilo del título
        titulo_font = Font(name='Calibri', size=16, bold=True, color='FFFFFF')
        titulo_fill = PatternFill(start_color='1F4788', end_color='1F4788', fill_type='solid')
        titulo_alignment = Alignment(horizontal='center', vertical='center')
        
        # Estilo del encabezado de columnas
        header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        # Estilo de las celdas de datos
        cell_font = Font(name='Calibri', size=10)
        cell_alignment = Alignment(horizontal='left', vertical='center')
        cell_border = Border(
            left=Side(style='thin', color='D3D3D3'),
            right=Side(style='thin', color='D3D3D3'),
            top=Side(style='thin', color='D3D3D3'),
            bottom=Side(style='thin', color='D3D3D3')
        )
        
        # =====================================================================
        # TÍTULO DEL REPORTE
        # =====================================================================
        
        ws.merge_cells('A1:R1')
        cell_titulo = ws['A1']
        cell_titulo.value = "REPORTE DE CLIENTES"
        cell_titulo.font = titulo_font
        cell_titulo.fill = titulo_fill
        cell_titulo.alignment = titulo_alignment
        ws.row_dimensions[1].height = 30
        
        # =====================================================================
        # ENCABEZADOS DE COLUMNAS
        # =====================================================================
        
        headers = [
            'RUC/DNI',
            'Nombre / Razón Social',
            'Tipo',
            'Sede',
            'Estado',
            'Contacto 1',
            'Cargo 1',
            'Teléfono 1',
            'Email 1',
            'Contacto 2',
            'Cargo 2',
            'Teléfono 2',
            'Email 2',
            'Estatus Ficha',
            'Correo Conf.',
            'Total Ofertas',
            'Subastas Ganadas',
            'Fecha Registro'
        ]
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = cell_border
        
        ws.row_dimensions[2].height = 35
        
        # =====================================================================
        # DATOS DE CLIENTES
        # =====================================================================
        
        row_num = 3
        for cliente in clientes:
            # Calcular estadísticas de participación
            total_ofertas = Oferta.objects.filter(cliente=cliente).count()
            
            # Subastas ganadas: subastas finalizadas donde este cliente tiene la oferta ganadora
            subastas_ganadas = Oferta.objects.filter(
                cliente=cliente,
                es_ganadora=True,
                subasta__estado='FINALIZADA'
            ).count()
            
            # Datos de la fila
            row_data = [
                cliente.ruc_dni,
                cliente.nombre_razon_social,
                cliente.get_tipo_display(),
                cliente.sede,
                cliente.get_estado_display(),
                cliente.contacto_1,
                cliente.cargo_1,
                cliente.numero_1,
                cliente.correo_electronico_1,
                cliente.contacto_2 or '',
                cliente.cargo_2 or '',
                cliente.numero_2 or '',
                cliente.correo_electronico_2 or '',
                cliente.get_estatus_ficha_display(),
                'Sí' if cliente.confirmacion_correo else 'No',
                total_ofertas,
                subastas_ganadas,
                cliente.fecha_creacion.strftime('%d/%m/%Y')
            ]
            
            # Escribir la fila
            for col_num, value in enumerate(row_data, 1):
                cell = ws.cell(row=row_num, column=col_num)
                cell.value = value
                cell.font = cell_font
                cell.alignment = cell_alignment
                cell.border = cell_border
            
            row_num += 1
        
        # =====================================================================
        # AJUSTAR ANCHOS DE COLUMNAS
        # =====================================================================
        
        column_widths = {
            'A': 15,  # RUC/DNI
            'B': 35,  # Nombre / Razón Social
            'C': 18,  # Tipo
            'D': 20,  # Sede
            'E': 15,  # Estado
            'F': 25,  # Contacto 1
            'G': 20,  # Cargo 1
            'H': 15,  # Teléfono 1
            'I': 30,  # Email 1
            'J': 25,  # Contacto 2
            'K': 20,  # Cargo 2
            'L': 15,  # Teléfono 2
            'M': 30,  # Email 2
            'N': 18,  # Estatus Ficha
            'O': 14,  # Correo Conf.
            'P': 15,  # Total Ofertas
            'Q': 18,  # Subastas Ganadas
            'R': 18,  # Fecha Registro
        }
        
        for col_letter, width in column_widths.items():
            ws.column_dimensions[col_letter].width = width
        
        # =====================================================================
        # AGREGAR FILTROS AUTOMÁTICOS
        # =====================================================================
        
        if row_num > 3:  # Solo si hay datos
            ws.auto_filter.ref = f"A2:R{row_num-1}"
        
        # =====================================================================
        # GENERAR RESPUESTA HTTP CON EL ARCHIVO
        # =====================================================================
        
        # Crear nombre de archivo con timestamp
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reporte_clientes_{timestamp}.xlsx"
        
        # Preparar la respuesta HTTP
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        # Guardar el workbook en la respuesta
        wb.save(response)
        
        return response

    @action(detail=False, methods=['get'])
    def packing_excel(self, request):
        """
        Genera un reporte Excel profesional de packing (producción).
        
        Incluye desglose diario, totales por tipo y estado.
        """
        # Parámetros de filtro
        fecha_inicio_str = request.query_params.get('fecha_inicio', None)
        fecha_fin_str = request.query_params.get('fecha_fin', None)
        
        # Queryset base
        queryset = PackingSemanal.objects.select_related('empresa').prefetch_related(
            'tipos', 
            'tipos__tipo_fruta', 
            'tipos__detalles'
        ).order_by('-fecha_inicio_semana', 'empresa__nombre')
        
        # Filtros de fecha
        if fecha_inicio_str:
            try:
                fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_inicio_semana__gte=fecha_inicio)
            except ValueError:
                return Response({'error': 'Formato fecha_inicio inválido'}, status=400)
                
        if fecha_fin_str:
            try:
                fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_inicio_semana__lte=fecha_fin)
            except ValueError:
                return Response({'error': 'Formato fecha_fin inválido'}, status=400)

        # Generar Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "Reporte de Packing"
        
        # Estilos (Estética Naranja Profesional)
        titulo_font = Font(name='Calibri', size=16, bold=True, color='FFFFFF')
        titulo_fill = PatternFill(start_color='E46C0A', end_color='E46C0A', fill_type='solid') # Naranja para Packing
        titulo_alignment = Alignment(horizontal='center', vertical='center')
        
        header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='ED7D31', end_color='ED7D31', fill_type='solid')
        header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        cell_font = Font(name='Calibri', size=10)
        cell_alignment = Alignment(horizontal='left', vertical='center')
        cell_border = Border(
            left=Side(style='thin', color='D3D3D3'),
            right=Side(style='thin', color='D3D3D3'),
            top=Side(style='thin', color='D3D3D3'),
            bottom=Side(style='thin', color='D3D3D3')
        )
        
        # --- DEFINIR COLORES DE ESTADO PARA CELDAS DIARIAS ---
        fill_finalizada = PatternFill(start_color='DDEBF7', end_color='DDEBF7', fill_type='solid') # Azul claro
        fill_activa = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')     # Verde claro
        fill_programada = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')  # Amarillo claro
        fill_cancelada = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')   # Naranja/Rojo claro
        
        # Título
        ws.merge_cells('A1:L1')
        cell_titulo = ws['A1']
        cell_titulo.value = "REPORTE DE PACKING / PRODUCCIÓN"
        cell_titulo.font = titulo_font
        cell_titulo.fill = titulo_fill
        cell_titulo.alignment = titulo_alignment
        ws.row_dimensions[1].height = 30
        
        # Encabezados
        headers = [
            'Empresa', 'Semana', 'Tipo Fruta', 
            'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
            'KG Total', 'Estado', 'Observaciones'
        ]
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = cell_border
        
        ws.row_dimensions[2].height = 35
        
        # Datos
        row_num = 3
        for packing in queryset:
            tipos = packing.tipos.all()
            
            # Si el packing no tiene tipos registrados, mostrar una fila base
            if not tipos:
                row_data = [
                    packing.empresa.nombre,
                    f"{packing.fecha_inicio_semana.strftime('%d/%m/%Y')} - {packing.fecha_fin_semana.strftime('%d/%m/%Y')}",
                    'Sin producción registrada',
                    0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                    0.0,
                    packing.get_estado_display(),
                    packing.observaciones or ''
                ]
                
                for col_num, value in enumerate(row_data, 1):
                    cell = ws.cell(row=row_num, column=col_num)
                    cell.value = value
                    cell.font = cell_font
                    cell.alignment = cell_alignment
                    cell.border = cell_border
                    if 4 <= col_num <= 10:
                        cell.number_format = '#,##0.00'
                
                row_num += 1
                continue

            # Si tiene tipos, mostrar cada tipo
            for tipo in tipos:
                # Obtener kilos por día y los objetos PackingDetalle
                detalles_queryset = tipo.detalles.all()
                detalles_dict = {d.dia: d for d in detalles_queryset}
                
                # --- CALCULAR ESTADO ESPECÍFICO PARA ESTE TIPO ---
                from subastas.models import Subasta
                subastas_tipo = Subasta.objects.filter(packing_detalle__in=detalles_queryset)
                estados_list = [s.estado_calculado for s in subastas_tipo]
                
                if not subastas_tipo.exists():
                    estado_tipo = "PROYECTADO"
                else:
                    if 'ACTIVA' in estados_list:
                        estado_tipo = "EN SUBASTA"
                    elif any(e in ('FINALIZADA', 'CANCELADA') for e in estados_list):
                        # Se considera FINALIZADO si todos los días con producción tienen subastas 
                        # Y todas esas subastas están terminadas (Finalizada o Cancelada)
                        detalles_con_produccion = [d for d in detalles_queryset if d.py > 0]
                        detalles_con_subasta = [s.packing_detalle_id for s in subastas_tipo]
                        
                        todo_cubierto = all(d.id in detalles_con_subasta for d in detalles_con_produccion)
                        todas_terminadas = all(e in ('FINALIZADA', 'CANCELADA') for e in estados_list)
                        
                        if todo_cubierto and todas_terminadas:
                            estado_tipo = "FINALIZADO"
                        else:
                            estado_tipo = "PARCIAL"
                    elif 'PROGRAMADA' in estados_list:
                        estado_tipo = "PROGRAMADO"
                    else:
                        estado_tipo = "PROYECTADO"

                if packing.estado == 'ANULADO':
                    estado_tipo = "ANULADO"

                # Días de la semana para el mapeo
                dias_semana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']
                
                row_data = [
                    packing.empresa.nombre,
                    f"{packing.fecha_inicio_semana.strftime('%d/%m/%Y')} - {packing.fecha_fin_semana.strftime('%d/%m/%Y')}",
                    tipo.tipo_fruta.nombre,
                ]
                # Llenar los kilos para cada día
                for d_nom in dias_semana:
                    row_data.append(float(detalles_dict.get(d_nom).py) if d_nom in detalles_dict else 0.0)
                
                # Agregar el resto de campos
                row_data.extend([
                    float(tipo.kg_total),
                    estado_tipo,
                    packing.observaciones or ''
                ])
                
                # Escribir la fila y aplicar color naranja SOLO a canceladas
                for col_num, value in enumerate(row_data, 1):
                    cell = ws.cell(row=row_num, column=col_num)
                    cell.value = value
                    cell.font = cell_font
                    cell.alignment = cell_alignment
                    cell.border = cell_border
                    
                    # Formato numérico para KGs (Columnas D a J)
                    if 4 <= col_num <= 10:
                        cell.number_format = '#,##0.00'
                    
                    # --- APLICAR COLOR NARANJA SOLO SI LA SUBASTA ESTÁ CANCELADA ---
                    if 4 <= col_num <= 9:
                        dia_nombre = dias_semana[col_num - 4]
                        detalle_dia = detalles_dict.get(dia_nombre)
                        
                        if detalle_dia and value > 0:
                            try:
                                subasta_dia = Subasta.objects.get(packing_detalle=detalle_dia)
                                if subasta_dia.estado_calculado == 'CANCELADA':
                                    cell.fill = fill_cancelada
                            except Subasta.DoesNotExist:
                                pass 
                
                row_num += 1
        
        # Anchos
        column_widths = {
            'A': 25, 'B': 25, 'C': 20, 
            'D': 10, 'E': 10, 'F': 10, 'G': 10, 'H': 10, 'I': 10,
            'J': 15, 'K': 15, 'L': 40
        }
        for col_letter, width in column_widths.items():
            ws.column_dimensions[col_letter].width = width
            
        if row_num > 3:
            ws.auto_filter.ref = f"A2:L{row_num-1}"
            
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reporte_packing_{timestamp}.xlsx"
        
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        wb.save(response)
        
        return response
