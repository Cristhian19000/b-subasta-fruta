"""
Signals para el módulo de subastas.

Al crear una nueva subasta PROGRAMADA, se lanza automáticamente
un timer exacto (asyncio) que activará/finalizará la subasta
en el momento preciso sin ningún delay.
"""

import asyncio
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='subastas.Subasta')
def programar_timer_nueva_subasta(sender, instance, created, **kwargs):
    """
    Al crear una subasta en estado PROGRAMADA, lanza su timer exacto.
    El timer dormirá hasta fecha_hora_inicio y luego activará la subasta.
    """
    if not created or instance.estado != 'PROGRAMADA':
        return

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            from subastas.scheduler import programar_timer_subasta
            asyncio.ensure_future(programar_timer_subasta(instance.id))
            logger.info(f"⏰ Timer programado para nueva subasta #{instance.id}")
        else:
            logger.debug(f"No hay event loop activo para programar timer de subasta #{instance.id}")
    except RuntimeError:
        # No hay event loop (ej: durante tests o comandos de gestión)
        pass
