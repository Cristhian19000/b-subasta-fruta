/**
 * Componente para ver el detalle de una subasta.
 *
 * RF-03: Muestra el cliente ganador, monto y historial de ofertas.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge, Button, Alert, Modal } from "../../components/common";
import {
  getSubasta,
  getHistorialOfertas,
  cancelarSubasta,
} from "../../api/subastas";
import { Circle, Trophy, XCircle, Clock, Zap } from "lucide-react";
import { useSubastasContext } from "../../context/SubastasWSContext";

// Colores para estados
const ESTADO_COLORS = {
  PROGRAMADA: "warning",
  ACTIVA: "success",
  FINALIZADA: "default",
  CANCELADA: "error",
};

const SubastaDetalle = ({ subasta: initialSubasta, onClose, onUpdate, openSubastaById }) => {
  const [subasta, setSubasta] = useState(initialSubasta);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(null); // null hasta sincronizar
  const [serverOffset, setServerOffset] = useState(0);
  const serverOffsetRef = useRef(0); // Ref para el intervalo (evitar closures stale)
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  // Anti-sniping: aviso visual cuando se extiende el tiempo
  const [tiempoExtendido, setTiempoExtendido] = useState(null); // segundos extendidos
  const prevFechaFinRef = useRef(null);

  // WebSocket para actualizaciones en tiempo real
  const { onRefreshNeeded, subastaActualizada } = useSubastasContext();

  // Escuchar eventos de WebSocket para esta subasta
  useEffect(() => {
    // Usar initialSubasta.id (prop fijo) para comparar, no subasta.id (estado)
    const subastaId = initialSubasta?.id;
    if (!subastaActualizada || !subastaId) return;
    
    // Comparar como números para evitar problemas de tipo
    const wsSubastaId = Number(subastaActualizada.subasta?.id);
    if (wsSubastaId !== Number(subastaId)) return;

    const { subasta: wsSubasta, cambios } = subastaActualizada;
    if (!wsSubasta) return;

    console.log('📡 WebSocket para subasta', subastaId, ':', { cambios, fecha_hora_fin: wsSubasta.fecha_hora_fin });

    // Detectar anti-sniping para mostrar notificación
    const esAntiSniping = cambios?.includes('tiempo_extendido') || wsSubasta?.tiempo_extendido;
    
    if (esAntiSniping && prevFechaFinRef.current && wsSubasta?.fecha_hora_fin) {
      const prevFin = new Date(prevFechaFinRef.current).getTime();
      const newFin = new Date(wsSubasta.fecha_hora_fin).getTime();
      const diffSeg = Math.round((newFin - prevFin) / 1000);
      if (diffSeg > 0) {
        console.log(`⚡ Anti-sniping: +${diffSeg}s`);
        setTiempoExtendido(diffSeg);
        setTimeout(() => setTiempoExtendido(null), 8000);
      }
    }

    // SIEMPRE actualizar fecha_hora_fin si viene en el mensaje (crítico para sincronización)
    if (wsSubasta.fecha_hora_fin) {
      prevFechaFinRef.current = wsSubasta.fecha_hora_fin;
      setSubasta(prev => ({
        ...prev,
        fecha_hora_fin: wsSubasta.fecha_hora_fin,
        precio_actual: wsSubasta.precio_actual || prev.precio_actual,
        total_ofertas: wsSubasta.total_ofertas ?? prev.total_ofertas,
        estado_actual: wsSubasta.estado || prev.estado_actual,
      }));
    }
  }, [subastaActualizada, initialSubasta?.id]);

  // Cargar detalle completo
  useEffect(() => {
    const cargarDetalle = async () => {
      try {
        setLoading(true);
        const [detalleRes, historialRes] = await Promise.all([
          getSubasta(initialSubasta.id),
          getHistorialOfertas(initialSubasta.id),
        ]);

        setSubasta(detalleRes.data);
        setHistorial(historialRes.data.historial || []);

        // Calcular offset del servidor
        if (detalleRes.data.ahora_servidor) {
          const serverTime = new Date(detalleRes.data.ahora_servidor).getTime();
          const localTime = new Date().getTime();
          const offset = serverTime - localTime;
          setServerOffset(offset);
          serverOffsetRef.current = offset;
        }

        // Cálculo inicial del tiempo restante
        if (detalleRes.data.fecha_hora_fin) {
          const fin = new Date(detalleRes.data.fecha_hora_fin).getTime();
          const ahora = detalleRes.data.ahora_servidor
            ? new Date(detalleRes.data.ahora_servidor).getTime()
            : new Date().getTime();
          setTiempoRestante(Math.max(0, Math.floor((fin - ahora) / 1000)));
          prevFechaFinRef.current = detalleRes.data.fecha_hora_fin;
        }
      } catch (err) {
        console.error("Error cargando detalle:", err);
        setError("Error al cargar el detalle de la subasta");
      } finally {
        setLoading(false);
      }
    };

    cargarDetalle();
  }, [initialSubasta.id]);

  // Actualizar tiempo restante cada segundo si está activa y ya sincronizamos
  useEffect(() => {
    // No iniciar el contador hasta tener el tiempo sincronizado del servidor
    if (subasta?.estado_actual !== "ACTIVA" || !subasta?.fecha_hora_fin || tiempoRestante === null) return;

    // Inicializar ref si no tiene valor
    if (!prevFechaFinRef.current) {
      prevFechaFinRef.current = subasta.fecha_hora_fin;
    }

    const interval = setInterval(() => {
      // Usar ref para siempre leer el valor más actualizado (incluyendo cambios de anti-sniping)
      const fechaFin = prevFechaFinRef.current || subasta.fecha_hora_fin;
      const fin = new Date(fechaFin).getTime();
      const ahoraLocal = new Date().getTime();
      const ahoraSincronizado = ahoraLocal + serverOffsetRef.current;

      const segundos = Math.max(
        0,
        Math.floor((fin - ahoraSincronizado) / 1000),
      );
      setTiempoRestante(segundos);

      // Si llega a cero, refrescar datos para cambiar estado
      if (segundos === 0) {
        // Pequeño delay para asegurar que el server ya procesó el cierre
        setTimeout(() => window.location.reload(), 2000);
      }
    }, 1000);

    return () => clearInterval(interval);
    // Nota: subasta.fecha_hora_fin solo se usa para la condición inicial, el intervalo lee de prevFechaFinRef
  }, [subasta?.estado_actual, !!subasta?.fecha_hora_fin, tiempoRestante !== null]);

  // Re-sincronizar con el servidor periódicamente (cada 30 segundos)
  useEffect(() => {
    if (subasta?.estado_actual !== "ACTIVA") return;

    const syncInterval = setInterval(async () => {
      try {
        const res = await getSubasta(subasta.id);
        if (res.data.ahora_servidor) {
          const serverTime = new Date(res.data.ahora_servidor).getTime();
          const localTime = new Date().getTime();
          const offset = serverTime - localTime;
          setServerOffset(offset);
          serverOffsetRef.current = offset;
        }

        // Detectar si el servidor extendió el tiempo (anti-sniping)
        if (prevFechaFinRef.current && res.data.fecha_hora_fin) {
          const prevFin = new Date(prevFechaFinRef.current).getTime();
          const newFin = new Date(res.data.fecha_hora_fin).getTime();
          const diffSeg = Math.round((newFin - prevFin) / 1000);
          if (diffSeg > 5) {
            // El tiempo fue extendido
            setTiempoExtendido(diffSeg);
            setTimeout(() => setTiempoExtendido(null), 8000);
          }
          prevFechaFinRef.current = res.data.fecha_hora_fin;
        }

        const histRes = await getHistorialOfertas(subasta.id);
        setHistorial(histRes.data.historial || []);
        setSubasta(res.data);
      } catch (e) {
        console.error("Error en re-sincronización:", e);
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [subasta?.id, subasta?.estado_actual]);

  // Cancelar subasta
  const handleCancelar = async () => {
    try {
      setCancelando(true);
      const response = await cancelarSubasta(subasta.id);

      // Actualizar estado local
      setSubasta((prev) => ({ ...prev, estado_actual: "CANCELADA" }));
      setShowCancelarModal(false);

      // Notificar al padre si existe callback
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error cancelando subasta:", err);
      alert(err.response?.data?.error || "Error al cancelar la subasta");
    } finally {
      setCancelando(false);
    }
  };

  // Formatters
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount || 0);
  };

  const formatKg = (kg) => {
    return (
      new Intl.NumberFormat("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(kg || 0) + " kg"
    );
  };

  const formatTiempo = (segundos) => {
    if (segundos <= 0) return "00:00:00";

    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;

    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <Alert type="error">{error}</Alert>;
  }

  if (!subasta) return null;

  const ganador = historial.find((o) => o.es_ganadora);

  return (
    <div className="space-y-6">
      {/* Alerta si esta subasta fue reemplazada */}
      {subasta.subasta_reemplazo && (
        <Alert type="info">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <span>
                Esta subasta fue <strong>reemplazada</strong>. La nueva subasta
                (ID #{subasta.subasta_reemplazo.id}) está{" "}
                <strong>{subasta.subasta_reemplazo.estado}</strong>.
              </span>
            </div>
            <div>
              <button
                className="text-sm text-blue-600 cursor-pointer hover:underline hover:text-blue-700"
                onClick={() => {
                  const id = subasta.subasta_reemplazo.id;
                  if (typeof openSubastaById === 'function') {
                    openSubastaById(id);
                    return;
                  }
                  if (window && window.openSubastaById) {
                    window.openSubastaById(id);
                  }
                }}
              >
                Ver nueva subasta
              </button>
            </div>
          </div>
        </Alert>
      )}

      {/* Aviso de extensión de tiempo (anti-sniping) */}
      {tiempoExtendido && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-amber-700">⏰ ¡Tiempo extendido!</span>
            <span className="text-amber-600 ml-1.5">
              Nueva puja recibida — se agregaron{' '}
              <strong>
                {tiempoExtendido >= 60
                  ? `${Math.floor(tiempoExtendido / 60)} min${tiempoExtendido % 60 > 0 ? ` ${tiempoExtendido % 60}s` : ''}`
                  : `${tiempoExtendido}s`}
              </strong>{' '}
              al tiempo
            </span>
          </div>
        </div>
      )}

      {/* Estado y tiempo restante */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <Badge
            variant={ESTADO_COLORS[subasta.estado_actual]}
            className="text-lg px-4 py-2"
          >
            {subasta.estado_actual === "ACTIVA" ? (
              <span className="flex items-center gap-2">
                <Circle className="w-3 h-3 fill-current animate-pulse" />
                EN VIVO
              </span>
            ) : (
              subasta.estado_actual
            )}
          </Badge>
        </div>

        {subasta.estado_actual === "ACTIVA" && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Tiempo restante</div>
            <div className="text-3xl font-mono font-bold text-red-600">
              {tiempoRestante !== null ? formatTiempo(tiempoRestante) : '--:--'}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {subasta.estado_actual === "PROGRAMADA" && (
            <Button
              variant="warning"
              onClick={() => {
                onClose(); // Cerrar detalle
                // Necesitamos una forma de decirle al padre que abra el edit
                if (window.handleOpenEdit) window.handleOpenEdit(subasta);
              }}
            >
              Editar Programación
            </Button>
          )}
        </div>
      </div>

      {/* Información del producto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-xs text-blue-600 uppercase">Tipo de Fruta</div>
          <div className="text-lg font-semibold text-blue-900">
            {subasta.tipo_fruta_nombre}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-xs text-green-600 uppercase">Empresa</div>
          <div className="text-lg font-semibold text-green-900">
            {subasta.empresa_nombre}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-xs text-purple-600 uppercase">
            Fecha Producción
          </div>
          <div className="text-lg font-semibold text-purple-900">
            {subasta.dia_display} - {subasta.fecha_produccion}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-xs text-orange-600 uppercase">Kilos</div>
          <div className="text-lg font-semibold text-orange-900">
            {formatKg(subasta.kilos)}
          </div>
        </div>
        {subasta.extensiones_realizadas > 0 && (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="text-xs text-amber-600 uppercase font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Extendido
            </div>
            <div className="text-lg font-semibold text-amber-900">
              {subasta.extensiones_realizadas}{" "}
              {subasta.extensiones_realizadas === 1 ? "vez" : "veces"}
            </div>
          </div>
        )}
      </div>

      {/* Horario de la subasta */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
          Horario de la Subasta
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Inicio</div>
            <div className="text-sm font-medium">
              {formatDateTime(subasta.fecha_hora_inicio)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Fin</div>
            <div className="text-sm font-medium">
              {formatDateTime(subasta.fecha_hora_fin)}
            </div>
          </div>
        </div>
      </div>

      {/* Precios */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <div className="text-xs text-gray-500 uppercase">Precio Base</div>
          <div className="text-2xl font-bold text-gray-700">
            {formatCurrency(subasta.precio_base)}
          </div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <div className="text-xs text-green-600 uppercase">Precio Actual</div>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(subasta.precio_actual)}
          </div>
        </div>
      </div>

      {/* Ganador actual */}
      {ganador && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-700 uppercase mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {subasta.estado_actual === "FINALIZADA" ? "Ganador" : "Ganando"}
            </div>
          </h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-bold text-yellow-900">
                {ganador.cliente_nombre}
              </div>
              <div className="text-sm text-yellow-700">
                {ganador.cliente_ruc_dni}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-900">
                {formatCurrency(ganador.monto)}
              </div>
              <div className="text-xs text-yellow-600">
                {new Date(ganador.fecha_oferta).toLocaleString("es-PE")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de ofertas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
          Historial de Ofertas ({historial.length})
        </h3>

        {historial.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Fecha/Hora
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historial.map((oferta, index) => (
                  <tr
                    key={oferta.id}
                    className={`${oferta.es_ganadora ? "bg-yellow-50" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                      {oferta.es_ganadora && (
                        <Trophy className="w-4 h-4 text-yellow-600 ml-1 inline-block" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {oferta.cliente_nombre}
                      </div>
                      <div className="text-xs text-gray-500">
                        {oferta.cliente_ruc_dni}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${oferta.es_ganadora ? "text-yellow-700" : "text-gray-900"}`}
                      >
                        {formatCurrency(oferta.monto)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {new Date(oferta.fecha_oferta).toLocaleString("es-PE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No hay ofertas registradas</p>
          </div>
        )}
      </div>

      {/* Imágenes */}
      {subasta.imagenes && subasta.imagenes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
            Imágenes del Producto
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {subasta.imagenes.map((img, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={img.imagen_url || img.imagen}
                  alt={img.descripcion || `Imagen ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      {/* Modal de confirmación de cancelación */}
      <Modal
        isOpen={showCancelarModal}
        onClose={() => setShowCancelarModal(false)}
        title="Confirmar Cancelación de Subasta"
        size="md"
      >
        <div className="space-y-4">
          {historial.length > 0 ? (
            <Alert type="warning">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>
                    ⚠️ Esta subasta tiene {historial.length} oferta
                    {historial.length !== 1 ? "s" : ""} activa
                    {historial.length !== 1 ? "s" : ""}
                  </strong>
                  <p className="mt-2 text-sm">
                    Al cancelar, se notificará a los{" "}
                    {new Set(historial.map((o) => o.cliente_id)).size}{" "}
                    participante
                    {new Set(historial.map((o) => o.cliente_id)).size !== 1
                      ? "s"
                      : ""}
                    .
                  </p>
                </div>
              </div>
            </Alert>
          ) : (
            <p className="text-gray-700">
              ¿Está seguro de cancelar esta subasta? Esta acción no se puede
              deshacer.
            </p>
          )}

          <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
            <p>
              <strong>Nota:</strong> Si desea volver a subastar este día, puede
              hacerlo desde la vista de Packing creando una nueva subasta.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setShowCancelarModal(false)}
              disabled={cancelando}
            >
              No, Mantener
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelar}
              disabled={cancelando}
            >
              {cancelando ? "Cancelando..." : "Sí, Cancelar Subasta"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubastaDetalle;
