from django.apps import AppConfig


class SubastasConfig(AppConfig):
    name = 'subastas'
    verbose_name = 'Módulo de Subastas'

    def ready(self):
        """Importar signals cuando la app está lista."""
        import subastas.signals  # noqa: F401
