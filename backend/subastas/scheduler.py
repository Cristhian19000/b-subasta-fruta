"""
Scheduler de timers exactos para subastas.

En lugar de hacer polling cada N segundos, calcula exactamente cuántos
segundos faltan para cada subasta y usa asyncio.sleep() con ese valor
preciso. Esto garantiza transiciones de estado en tiempo real (~0s delay).

Anti-sniping:
- Cuando alguien puja, views.py llama a notificar_puja(subasta_id)
- Esto activa un asyncio.Event que despierta el scheduler inmediatamente
- El scheduler evalúa si aplica la extensión de tiempo según la config de BD
- Si aplica: actualiza fecha_hora_fin en BD y notifica por WebSocket

Flujo:
1. Al arrancar el servidor → inicializar_timers() programa un timer por subasta
2. Al crear una nueva subasta → signal llama a programar_timer_subasta()
3. Al cumplirse el tiempo → actualiza BD + notifica por WebSocket
4. Al recibir una puja → notificar_puja() despierta el scheduler para evaluar extensión
"""

import asyncio
import logging
from asgiref.sync import sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)

# Conjunto de IDs de subastas que ya tienen timer activo (evita duplicados)
_timers_activos: set = set()

# Diccionario global: subasta_id → asyncio.Event para anti-sniping
_eventos_puja: dict = {}


def notificar_puja(subasta_id: int):
    """
    Llamado desde views.py cuando se registra una nueva puja.
    Evalúa SIEMPRE si aplica la extensión de tiempo (anti-sniping).
    
    Si hay un timer activo, lo despierta para que recalcule el tiempo.
    Si no hay timer, ejecuta la verificación directamente.
    """
    # Siempre ejecutar la verificación de anti-sniping (sync)
    extendida = _verificar_y_extender(subasta_id)
    if extendida:
        logger.info(f"⏰ Anti-sniping aplicado para subasta #{subasta_id}")
    
    # Además, despertar el timer si existe (para que recalcule el tiempo de fin)
    evento = _eventos_puja.get(subasta_id)
    if evento:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.call_soon_threadsafe(evento.set)
            else:
                evento.set()
        except RuntimeError:
            evento.set()


async def programar_timer_subasta(subasta_id: int):
    """
    Programa los timers exactos para una subasta:
    - Si está PROGRAMADA: duerme hasta fecha_hora_inicio → activa
    - Si está ACTIVA:     espera pujas o fin → finaliza (con anti-sniping)
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

        # --- Fase 2: ACTIVA → FINALIZADA (con anti-sniping) ---
        if estado == 'ACTIVA':
            # Crear evento para recibir señales de nuevas pujas
            evento = asyncio.Event()
            _eventos_puja[subasta_id] = evento

            try:
                while True:
                    # Leer el tiempo de fin actualizado desde BD
                    datos_actuales = await sync_to_async(_get_subasta_data)(subasta_id)
                    if not datos_actuales:
                        return  # Cancelada

                    _, _, fin_actual = datos_actuales
                    ahora = timezone.now()
                    segundos_fin = (fin_actual - ahora).total_seconds()

                    if segundos_fin <= 0:
                        # Tiempo agotado → finalizar
                        await sync_to_async(_finalizar_subasta)(subasta_id)
                        break

                    logger.info(
                        f"⏳ Subasta #{subasta_id}: finalizará en "
                        f"{segundos_fin:.1f}s (a las {fin_actual.strftime('%H:%M:%S')})"
                    )

                    try:
                        # Dormir hasta que se acabe el tiempo O llegue una puja
                        await asyncio.wait_for(evento.wait(), timeout=segundos_fin)
                        evento.clear()  # Resetear para la próxima puja

                        # → Llegó una puja: notificar_puja() ya ejecutó _verificar_y_extender()
                        # Solo necesitamos volver al inicio del loop para leer el nuevo fecha_hora_fin
                        logger.debug(f"⏰ Subasta #{subasta_id}: puja recibida, recalculando tiempo...")

                    except asyncio.TimeoutError:
                        # → Se acabó el tiempo sin más pujas → finalizar
                        await sync_to_async(_finalizar_subasta)(subasta_id)
                        break

            finally:
                _eventos_puja.pop(subasta_id, None)

    except asyncio.CancelledError:
        logger.info(f"Timer de subasta #{subasta_id} cancelado.")
    except Exception as e:
        logger.error(f"❌ Error en timer de subasta #{subasta_id}: {e}", exc_info=True)
    finally:
        _timers_activos.discard(subasta_id)
        _eventos_puja.pop(subasta_id, None)


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


def _verificar_y_extender(subasta_id: int) -> bool:
    """
    Verifica si aplica la extensión de tiempo (anti-sniping) y la ejecuta.

    Condiciones para extender:
    1. Anti-sniping habilitado en la configuración
    2. Quedan menos segundos que el umbral configurado
    3. No se ha alcanzado el máximo de extensiones (0 = ilimitado)

    Retorna True si se extendió el tiempo, False si no aplica.
    """
    from .models import Subasta, ConfiguracionSubasta
    from .websocket_service import SubastaWebSocketService
    from datetime import timedelta

    try:
        config = ConfiguracionSubasta.get()

        if not config.antisniping_habilitado:
            return False

        subasta = Subasta.objects.get(pk=subasta_id, estado='ACTIVA')
        ahora = timezone.now()
        segundos_restantes = (subasta.fecha_hora_fin - ahora).total_seconds()

        # Verificar umbral
        if segundos_restantes >= config.antisniping_umbral_segundos:
            return False  # Quedan suficientes segundos, no extender

        # Verificar límite de extensiones
        if (config.antisniping_max_extensiones > 0 and
                subasta.extensiones_realizadas >= config.antisniping_max_extensiones):
            logger.info(
                f"ℹ️ Subasta #{subasta_id}: límite de extensiones alcanzado "
                f"({subasta.extensiones_realizadas}/{config.antisniping_max_extensiones})"
            )
            return False

        # Aplicar extensión
        nueva_fin = subasta.fecha_hora_fin + timedelta(seconds=config.antisniping_extension_segundos)
        subasta.fecha_hora_fin = nueva_fin
        subasta.extensiones_realizadas += 1
        subasta.save(update_fields=['fecha_hora_fin', 'extensiones_realizadas', 'fecha_actualizacion'])

        logger.info(
            f"⏰ Subasta #{subasta_id}: extendida +{config.antisniping_extension_segundos}s "
            f"→ nueva fin: {nueva_fin.strftime('%H:%M:%S')} "
            f"(extensión {subasta.extensiones_realizadas})"
        )

        # Notificar a todos los clientes conectados
        SubastaWebSocketService.notificar_subasta_actualizada(
            subasta,
            cambios=['fecha_hora_fin', 'tiempo_extendido'],
            extra_data={'tiempo_extendido': True}
        )

        return True

    except Subasta.DoesNotExist:
        return False
    except Exception as e:
        logger.error(f"❌ Error en _verificar_y_extender para subasta #{subasta_id}: {e}", exc_info=True)
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
