"""
Servicio para enviar notificaciones WebSocket desde cualquier parte del código.

Este módulo proporciona funciones helper para enviar eventos a los canales
WebSocket sin necesidad de importar directamente channel_layer.

Uso:
    from subastas.websocket_service import SubastaWebSocketService
    
    # Notificar nueva subasta
    SubastaWebSocketService.notificar_subasta_creada(subasta)
    
    # Notificar nueva puja
    SubastaWebSocketService.notificar_nueva_puja(subasta, oferta)
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from decimal import Decimal


def _decimal_to_str(obj):
    """Convierte Decimals a strings para JSON."""
    if isinstance(obj, Decimal):
        return str(obj)
    return obj


class SubastaWebSocketService:
    """
    Servicio para enviar notificaciones WebSocket relacionadas con subastas.
    """
    
    GRUPO_GENERAL = "subastas_general"
    
    @classmethod
    def _get_channel_layer(cls):
        """Obtiene el channel layer."""
        return get_channel_layer()
    
    @classmethod
    def _send_to_group(cls, grupo, evento, datos):
        """Envía un mensaje a un grupo."""
        channel_layer = cls._get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                grupo,
                {
                    "type": evento.replace("-", "_"),  # Convertir guiones a underscores
                    **datos
                }
            )
    
    @classmethod
    def _serialize_subasta(cls, subasta):
        """Serializa una subasta para enviar por WebSocket."""
        return {
            "id": subasta.id,
            "estado": subasta.estado,
            "estado_calculado": subasta.estado_calculado,
            "precio_base": str(subasta.precio_base),
            "precio_actual": str(subasta.precio_actual),
            "fecha_hora_inicio": subasta.fecha_hora_inicio.isoformat(),
            "fecha_hora_fin": subasta.fecha_hora_fin.isoformat(),
            "tiempo_restante_segundos": subasta.tiempo_restante_segundos,
            "total_ofertas": subasta.ofertas.count(),
            "empresa": {
                "id": subasta.empresa.id,
                "nombre": subasta.empresa.nombre
            } if subasta.empresa else None,
            "tipo_fruta": {
                "id": subasta.tipo_fruta.id,
                "nombre": subasta.tipo_fruta.nombre
            } if subasta.tipo_fruta else None,
            "kilos": str(subasta.kilos_totales) if subasta.kilos_totales else None,
            "fecha": str(subasta.packing_detalle.fecha) if hasattr(subasta.packing_detalle, 'fecha') else None
        }
    
    @classmethod
    def _serialize_puja(cls, oferta):
        """Serializa una puja/oferta para enviar por WebSocket."""
        return {
            "id": oferta.id,
            "monto": str(oferta.monto),
            "fecha_oferta": oferta.fecha_oferta.isoformat(),
            "es_ganadora": oferta.es_ganadora,
            "cliente": {
                "id": oferta.cliente.id,
                "nombre": oferta.cliente.nombre_razon_social
            }
        }
    
    # =========================================================================
    # Notificaciones al canal GENERAL (todos los usuarios conectados)
    # =========================================================================
    
    @classmethod
    def notificar_subasta_creada(cls, subasta_o_lista, mensaje="Nueva subasta disponible"):
        """
        Notifica que se creó una nueva subasta.
        
        Args:
            subasta_o_lista: Una subasta o lista de subastas creadas
            mensaje: Mensaje descriptivo
        """
        # Manejar tanto una subasta como una lista
        if hasattr(subasta_o_lista, '__iter__') and not hasattr(subasta_o_lista, 'id'):
            subastas = list(subasta_o_lista)
        else:
            subastas = [subasta_o_lista]
        
        for subasta in subastas:
            cls._send_to_group(
                cls.GRUPO_GENERAL,
                "subasta_creada",
                {
                    "subasta": cls._serialize_subasta(subasta),
                    "mensaje": mensaje
                }
            )
    
    @classmethod
    def notificar_subasta_actualizada(cls, subasta, cambios=None):
        """
        Notifica que una subasta fue actualizada.
        
        Args:
            subasta: Subasta actualizada
            cambios: Lista de campos que cambiaron
        """
        cls._send_to_group(
            cls.GRUPO_GENERAL,
            "subasta_actualizada",
            {
                "subasta": cls._serialize_subasta(subasta),
                "cambios": cambios or []
            }
        )
        
        # También notificar al canal específico de la subasta
        cls._send_to_group(
            f"subasta_{subasta.id}",
            "subasta_actualizada",
            {
                "subasta": cls._serialize_subasta(subasta),
                "cambios": cambios or []
            }
        )
    
    @classmethod
    def notificar_subasta_cancelada(cls, subasta, participantes_afectados=0, total_ofertas=0):
        """
        Notifica que una subasta fue cancelada.
        
        Args:
            subasta: Subasta cancelada
            participantes_afectados: Número de clientes que habían pujado
            total_ofertas: Total de ofertas que se cancelan
        """
        datos = {
            "subasta_id": subasta.id,
            "subasta": cls._serialize_subasta(subasta),
            "mensaje": f"La subasta #{subasta.id} ha sido cancelada",
            "participantes_afectados": participantes_afectados,
            "total_ofertas_canceladas": total_ofertas
        }
        
        # Notificar al canal general
        cls._send_to_group(cls.GRUPO_GENERAL, "subasta_cancelada", datos)
        
        # Notificar al canal específico de la subasta
        cls._send_to_group(
            f"subasta_{subasta.id}",
            "subasta_cancelada",
            datos
        )
    
    @classmethod
    def notificar_subasta_eliminada(cls, subasta_id, tipo_fruta=None, empresa=None):
        """
        Notifica que una subasta fue eliminada.
        
        Args:
            subasta_id: ID de la subasta eliminada
            tipo_fruta: Nombre del tipo de fruta (para el mensaje)
            empresa: Nombre de la empresa (para el mensaje)
        """
        mensaje = f"Subasta #{subasta_id}"
        if tipo_fruta:
            mensaje = f"Subasta #{subasta_id} - {tipo_fruta}"
            if empresa:
                mensaje += f" ({empresa})"
        
        cls._send_to_group(
            cls.GRUPO_GENERAL,
            "subasta_eliminada",
            {
                "subasta_id": subasta_id,
                "mensaje": f"{mensaje} ha sido eliminada"
            }
        )
    
    @classmethod
    def notificar_subasta_iniciada(cls, subasta):
        """
        Notifica que una subasta pasó a estado ACTIVA.
        """
        cls._send_to_group(
            cls.GRUPO_GENERAL,
            "subasta_iniciada",
            {
                "subasta": cls._serialize_subasta(subasta)
            }
        )
    
    @classmethod
    def notificar_subasta_finalizada(cls, subasta):
        """
        Notifica que una subasta finalizó.
        """
        ganador = None
        monto_final = str(subasta.precio_base)
        
        oferta_ganadora = subasta.oferta_ganadora
        if oferta_ganadora:
            ganador = {
                "id": oferta_ganadora.cliente.id,
                "nombre": oferta_ganadora.cliente.nombre_razon_social
            }
            monto_final = str(oferta_ganadora.monto)
        
        datos = {
            "subasta": cls._serialize_subasta(subasta),
            "ganador": ganador,
            "monto_final": monto_final,
            "total_pujas": subasta.ofertas.count()
        }
        
        # Notificar al canal general
        cls._send_to_group(cls.GRUPO_GENERAL, "subasta_finalizada", datos)
        
        # Notificar al canal específico
        cls._send_to_group(f"subasta_{subasta.id}", "subasta_finalizada", datos)
    
    # =========================================================================
    # Notificaciones al canal específico de una subasta
    # =========================================================================
    
    @classmethod
    def notificar_nueva_puja(cls, subasta, oferta, cliente_superado=None):
        """
        Notifica una nueva puja en una subasta.
        
        Args:
            subasta: Subasta donde se realizó la puja
            oferta: La nueva oferta/puja
            cliente_superado: El cliente que tenía la puja anterior (opcional)
        """
        grupo_subasta = f"subasta_{subasta.id}"
        
        # Enviar nueva puja a todos los conectados a esta subasta
        cls._send_to_group(
            grupo_subasta,
            "nueva_puja",
            {
                "puja": cls._serialize_puja(oferta),
                "precio_actual": str(subasta.precio_actual),
                "total_pujas": subasta.ofertas.count()
            }
        )
        
        # Si hay un cliente superado, enviar notificación especial
        if cliente_superado:
            cls._send_to_group(
                grupo_subasta,
                "puja_superada",
                {
                    "cliente_superado_id": cliente_superado.id,
                    "puja": cls._serialize_puja(oferta),
                    "precio_actual": str(subasta.precio_actual)
                }
            )
    
    @classmethod
    def notificar_tiempo_actualizado(cls, subasta):
        """
        Envía actualización del tiempo restante.
        Útil para sincronizar contadores en los clientes.
        """
        cls._send_to_group(
            f"subasta_{subasta.id}",
            "tiempo_actualizado",
            {
                "segundos_restantes": subasta.tiempo_restante_segundos,
                "estado": subasta.estado_calculado
            }
        )
