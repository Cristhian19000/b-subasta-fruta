import os
import traceback

# Inicializar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'subasta_frutas.settings')
import django
django.setup()

from rest_framework.test import APIRequestFactory
from subastas.reportes_views import ReporteSubastasViewSet

factory = APIRequestFactory()
req = factory.get('/api/admin/reportes/subastas/clientes_excel/')
from types import SimpleNamespace

# Simular usuario autenticado para evitar 401 y reproducir errores internos
req.user = SimpleNamespace(is_authenticated=True)

# Instanciar el ViewSet y llamar el método directamente (saltando autenticación/permits)
vs = ReporteSubastasViewSet()
try:
    resp = vs.clientes_excel(req)
    print('RESPONSE:', type(resp), getattr(resp, 'status_code', None))
except Exception:
    traceback.print_exc()
