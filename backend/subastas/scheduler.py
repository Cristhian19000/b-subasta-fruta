"""
Scheduler de timers exactos para subastas.

En lugar de hacer polling cada N segundos, calcula exactamente cuántos
segundos faltan para cada subasta y usa asyncio.sleep() con ese valor
preciso. Esto garantiza transiciones de estado en tiempo real (~0s delay).

Flujo:
1. Al arrancar el servidor → inicializar_timers() programa un timer por subasta
2. Al crear una nueva subasta → signal llama a programar_timer_subasta()
3. Al cumplirse el tiempo → actualiza BD + notifica por WebSocket
"""

import asyncio
import logging
from asgiref.sync import sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)

# Conjunto de IDs de subastas que ya tienen timer activo (evita duplicados)
_timers_activos: set = set()


async def programar_timer_subasta(subasta_id: int):
    """
    Programa los timers exactos para una subasta:
    - Si está PROGRAMADA: duerme hasta fecha_hora_inicio → activa
    - Si está ACTIVA:     duerme hasta fecha_hora_fin   → finaliza
    """
    if subasta_id in _timers_activos:
        logger.debug(f"Subasta #{subasta_id} ya tiene timer activo, ignorando.")
        return

    _timers_activos.add(subasta_id)
    logger.info(f"⏰ Timer registrado para subasta #{subasta_id}")

    try:
        # --- Fase 1: PROGRAMADA → ACTIVA ---
        datos = await sync_to_async(_get_subasta_data)(subasta_id)
        if not datos:
            return  # Cancelada o no existe

        estado, inicio, fin = datos

        if estado == 'PROGRAMADA':
            ahora = timezone.now()
            segundos_inicio = (inicio - ahora).total_seconds()

            if segundos_inicio > 0:
                logger.info(
                    f"⏳ Subasta #{subasta_id}: iniciará en "
                    f"{segundos_inicio:.1f}s (a las {inicio.strftime('%H:%M:%S')})"
                )
                await asyncio.sleep(segundos_inicio)

            # Activar en BD y notificar
            activada = await sync_to_async(_activar_subasta)(subasta_id)
            if not activada:
                return  # Fue cancelada mientras esperábamos
            estado = 'ACTIVA'

        # --- Fase 2: ACTIVA → FINALIZADA ---
        if estado == 'ACTIVA':
            ahora = timezone.now()
            segundos_fin = (fin - ahora).total_seconds()

            if segundos_fin > 0:
                logger.info(
                    f"⏳ Subasta #{subasta_id}: finalizará en "
                    f"{segundos_fin:.1f}s (a las {fin.strftime('%H:%M:%S')})"
                )
                await asyncio.sleep(segundos_fin)

            # Finalizar en BD y notificar
            await sync_to_async(_finalizar_subasta)(subasta_id)

    except asyncio.CancelledError:
        logger.info(f"Timer de subasta #{subasta_id} cancelado.")
    except Exception as e:
        logger.error(f"❌ Error en timer de subasta #{subasta_id}: {e}", exc_info=True)
    finally:
        _timers_activos.discard(subasta_id)


def _get_subasta_data(subasta_id: int):
    """
    Obtiene (estado, fecha_hora_inicio, fecha_hora_fin) de la subasta.
    Retorna None si no existe o ya está en estado terminal.
    """
    from .models import Subasta
    try:
        s = Subasta.objects.get(pk=subasta_id)
        if s.estado in ('CANCELADA', 'FINALIZADA'):
            return None
        return s.estado, s.fecha_hora_inicio, s.fecha_hora_fin
    except Subasta.DoesNotExist:
        return None


def _activar_subasta(subasta_id: int) -> bool:
    """
    Cambia el estado de PROGRAMADA → ACTIVA en BD y envía notificación WebSocket.
    Retorna True si se activó, False si ya fue cancelada/modificada.
    """
    from .models import Subasta
    from .websocket_service import SubastaWebSocketService

    try:
        # Solo actualizar si sigue PROGRAMADA (no fue cancelada manualmente)
        subasta = Subasta.objects.get(pk=subasta_id, estado='PROGRAMADA')
        subasta.estado = 'ACTIVA'
        subasta.save(update_fields=['estado', 'fecha_actualizacion'])
        logger.info(f"✅ Subasta #{subasta_id} → ACTIVA")

        # Notificar al canal general y al canal específico de la subasta
        SubastaWebSocketService.notificar_subasta_iniciada(subasta)
        SubastaWebSocketService.notificar_subasta_actualizada(subasta, cambios=['estado'])
        return True

    except Subasta.DoesNotExist:
        logger.info(f"ℹ️ Subasta #{subasta_id} ya no está PROGRAMADA (cancelada o activada manualmente).")
        return False


def _finalizar_subasta(subasta_id: int):
    """
    Cambia el estado de ACTIVA → FINALIZADA en BD y envía notificación WebSocket.
    """
    from .models import Subasta
    from .websocket_service import SubastaWebSocketService

    try:
        # Solo actualizar si sigue ACTIVA
        subasta = Subasta.objects.get(pk=subasta_id, estado='ACTIVA')
        subasta.estado = 'FINALIZADA'
        subasta.save(update_fields=['estado', 'fecha_actualizacion'])
        logger.info(f"🏁 Subasta #{subasta_id} → FINALIZADA")

        # Notificar al canal general y al canal específico
        SubastaWebSocketService.notificar_subasta_finalizada(subasta)
        SubastaWebSocketService.notificar_subasta_actualizada(subasta, cambios=['estado'])

    except Subasta.DoesNotExist:
        logger.info(f"ℹ️ Subasta #{subasta_id} ya no está ACTIVA (cancelada o finalizada manualmente).")


async def inicializar_timers():
    """
    Al arrancar el servidor ASGI, programa timers para todas las subastas
    que aún están en estado PROGRAMADA o ACTIVA.
    Llamado desde el lifespan handler en asgi.py.
    """
    from django.db import close_old_connections
    await sync_to_async(close_old_connections)()

    ids_pendientes = await sync_to_async(_get_ids_pendientes)()

    logger.info(f"🚀 Inicializando timers para {len(ids_pendientes)} subastas pendientes: {ids_pendientes}")

    for subasta_id in ids_pendientes:
        asyncio.ensure_future(programar_timer_subasta(subasta_id))


def _get_ids_pendientes():
    """Obtiene los IDs de subastas PROGRAMADA o ACTIVA (sync)."""
    from .models import Subasta
    return list(
        Subasta.objects
        .filter(estado__in=['PROGRAMADA', 'ACTIVA'])
        .values_list('id', flat=True)
    )
