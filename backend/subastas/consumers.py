"""
WebSocket Consumers para el módulo de subastas.

Consumers:
1. SubastasConsumer - Canal general para notificaciones de subastas
2. SubastaDetalleConsumer - Canal específico para pujas en tiempo real
"""

import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async


class SubastasConsumer(AsyncJsonWebsocketConsumer):
    """
    Consumer para el canal general de subastas.
    
    Grupo: "subastas_general"
    
    Eventos que envía:
    - subasta_creada: Nueva subasta disponible
    - subasta_actualizada: Subasta modificada
    - subasta_cancelada: Subasta cancelada
    - subasta_iniciada: Subasta pasó a estado ACTIVA
    - subasta_finalizada: Subasta terminó
    """
    
    GRUPO_GENERAL = "subastas_general"
    
    async def connect(self):
        """Conexión establecida."""
        print("DEBUG: SubastasConsumer.connect")
        user = self.scope.get("user", AnonymousUser())
        
        # Unirse al grupo general
        await self.channel_layer.group_add(
            self.GRUPO_GENERAL,
            self.channel_name
        )
        
        await self.accept()
        
        # Enviar mensaje de bienvenida
        await self.send_json({
            "tipo": "conexion_establecida",
            "mensaje": "Conectado al canal de subastas",
            "autenticado": not isinstance(user, AnonymousUser),
            "usuario": await self._get_user_info(user)
        })
    
    async def disconnect(self, close_code):
        """Desconexión."""
        await self.channel_layer.group_discard(
            self.GRUPO_GENERAL,
            self.channel_name
        )
    
    async def receive_json(self, content):
        """
        Recibir mensaje del cliente.
        Por ahora solo manejamos ping/pong para mantener conexión viva.
        """
        tipo = content.get("tipo", "")
        
        if tipo == "ping":
            await self.send_json({"tipo": "pong"})
    
    # =========================================================================
    # Handlers para eventos del grupo
    # =========================================================================
    
    async def subasta_creada(self, event):
        """Nueva subasta creada."""
        await self.send_json({
            "tipo": "subasta_creada",
            "subasta": event["subasta"],
            "mensaje": event.get("mensaje", "Nueva subasta disponible")
        })
    
    async def subasta_actualizada(self, event):
        """Subasta actualizada."""
        print(f"DEBUG: SubastasConsumer.subasta_actualizada - Event: {event.get('tipo', 'n/a')}")
        await self.send_json({
            "tipo": "subasta_actualizada",
            "subasta": event["subasta"],
            "cambios": event.get("cambios", [])
        })
    
    async def subasta_cancelada(self, event):
        """Subasta cancelada."""
        await self.send_json({
            "tipo": "subasta_cancelada",
            "subasta_id": event["subasta_id"],
            "subasta": event.get("subasta"),
            "mensaje": event.get("mensaje", "Subasta cancelada"),
            "participantes_afectados": event.get("participantes_afectados", 0)
        })
    
    async def subasta_iniciada(self, event):
        """Subasta inició (pasó a ACTIVA)."""
        await self.send_json({
            "tipo": "subasta_iniciada",
            "subasta": event["subasta"]
        })
    
    async def subasta_finalizada(self, event):
        """Subasta finalizó."""
        await self.send_json({
            "tipo": "subasta_finalizada",
            "subasta": event["subasta"],
            "ganador": event.get("ganador"),
            "monto_final": event.get("monto_final")
        })
    
    async def subasta_eliminada(self, event):
        """Subasta eliminada."""
        await self.send_json({
            "tipo": "subasta_eliminada",
            "subasta_id": event["subasta_id"],
            "mensaje": event.get("mensaje", "Subasta eliminada")
        })
    
    @database_sync_to_async
    def _get_user_info(self, user):
        """Obtiene información básica del usuario."""
        if isinstance(user, AnonymousUser):
            return None
        
        # Determinar si es admin o cliente
        if hasattr(user, 'razon_social'):
            # Es un Cliente
            return {
                "tipo": "cliente",
                "id": user.id,
                "nombre": user.razon_social
            }
        else:
            # Es un User (admin)
            return {
                "tipo": "admin",
                "id": user.id,
                "nombre": user.get_full_name() or user.username
            }


class SubastaDetalleConsumer(AsyncJsonWebsocketConsumer):
    """
    Consumer para una subasta específica (pujas en tiempo real).
    
    Grupo: "subasta_{subasta_id}"
    
    Eventos que envía:
    - nueva_puja: Nueva oferta realizada
    - puja_superada: Tu puja fue superada
    - tiempo_actualizado: Actualización del tiempo restante
    - subasta_finalizada: La subasta terminó
    """
    
    async def connect(self):
        """Conexión a una subasta específica."""
        print(f"DEBUG: SubastaDetalleConsumer.connect - ID: {self.scope['url_route']['kwargs'].get('subasta_id')}")
        self.subasta_id = self.scope['url_route']['kwargs']['subasta_id']
        self.grupo_subasta = f"subasta_{self.subasta_id}"
        
        user = self.scope.get("user", AnonymousUser())
        
        # Verificar que la subasta existe
        subasta = await self._get_subasta()
        if not subasta:
            await self.close(code=4004)  # Not found
            return
        
        # Unirse al grupo de la subasta
        await self.channel_layer.group_add(
            self.grupo_subasta,
            self.channel_name
        )
        
        await self.accept()
        
        # Enviar estado actual de la subasta
        await self.send_json({
            "tipo": "conexion_establecida",
            "subasta_id": int(self.subasta_id),
            "subasta": subasta,
            "autenticado": not isinstance(user, AnonymousUser)
        })
    
    async def disconnect(self, close_code):
        """Desconexión."""
        await self.channel_layer.group_discard(
            self.grupo_subasta,
            self.channel_name
        )
    
    async def receive_json(self, content):
        """
        Recibir mensaje del cliente.
        
        Tipos de mensaje:
        - ping: Keep-alive
        - solicitar_estado: Solicitar estado actual de la subasta
        """
        tipo = content.get("tipo", "")
        
        if tipo == "ping":
            await self.send_json({"tipo": "pong"})
        
        elif tipo == "solicitar_estado":
            subasta = await self._get_subasta()
            await self.send_json({
                "tipo": "estado_actual",
                "subasta": subasta
            })
    
    # =========================================================================
    # Handlers para eventos del grupo
    # =========================================================================
    
    async def subasta_actualizada(self, event):
        """Subasta actualizada (cambio de precio, tiempo, etc)."""
        print(f"DEBUG: SubastaDetalleConsumer.subasta_actualizada - Event: {event.get('tipo', 'n/a')}")
        await self.send_json({
            "tipo": "subasta_actualizada",
            "subasta": event["subasta"],
            "cambios": event.get("cambios", [])
        })
    
    async def nueva_puja(self, event):
        """Nueva puja realizada."""
        await self.send_json({
            "tipo": "nueva_puja",
            "puja": event["puja"],
            "precio_actual": event["precio_actual"],
            "total_pujas": event.get("total_pujas", 0)
        })
    
    async def puja_superada(self, event):
        """Notificar que una puja fue superada (para el cliente específico)."""
        await self.send_json({
            "tipo": "puja_superada",
            "cliente_superado_id": event.get("cliente_superado_id"),
            "nueva_puja": event["puja"],
            "precio_actual": event["precio_actual"]
        })
    
    async def tiempo_actualizado(self, event):
        """Actualización del tiempo restante."""
        await self.send_json({
            "tipo": "tiempo_actualizado",
            "segundos_restantes": event["segundos_restantes"],
            "estado": event.get("estado", "ACTIVA")
        })
    
    async def subasta_finalizada(self, event):
        """La subasta terminó."""
        await self.send_json({
            "tipo": "subasta_finalizada",
            "subasta_id": int(self.subasta_id),
            "ganador": event.get("ganador"),
            "monto_final": event.get("monto_final"),
            "total_pujas": event.get("total_pujas", 0)
        })
    
    async def subasta_cancelada(self, event):
        """La subasta fue cancelada."""
        await self.send_json({
            "tipo": "subasta_cancelada",
            "subasta_id": int(self.subasta_id),
            "mensaje": event.get("mensaje", "La subasta ha sido cancelada")
        })
    
    @database_sync_to_async
    def _get_subasta(self):
        """Obtiene información de la subasta."""
        from .models import Subasta
        
        try:
            subasta = Subasta.objects.select_related(
                'packing_detalle__packing_tipo__packing_semanal__empresa',
                'packing_detalle__packing_tipo__tipo_fruta'
            ).get(pk=self.subasta_id)
            
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
                "empresa": subasta.empresa.nombre if subasta.empresa else None,
                "tipo_fruta": subasta.tipo_fruta.nombre if subasta.tipo_fruta else None,
                "kilos": str(subasta.kilos_totales) if subasta.kilos_totales else None
            }
        except Subasta.DoesNotExist:
            return None
