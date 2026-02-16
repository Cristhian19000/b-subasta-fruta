/**
 * Hook para WebSocket de Subastas.
 * 
 * Proporciona conexión en tiempo real para:
 * - Notificaciones de nuevas subastas
 * - Actualizaciones de subastas
 * - Pujas en tiempo real
 * 
 * Uso:
 * 
 * // Canal general (todas las subastas)
 * const { 
 *   isConnected, 
 *   lastMessage, 
 *   subastaCreada, 
 *   subastaCancelada 
 * } = useSubastasWebSocket();
 * 
 * // Canal específico (una subasta)
 * const { 
 *   isConnected, 
 *   subasta, 
 *   nuevaPuja, 
 *   sendMessage 
 * } = useSubastaDetalleWebSocket(subastaId);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// URL base del WebSocket (ajustar según entorno)
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

/**
 * Hook base para conexión WebSocket.
 * Maneja correctamente React StrictMode y cleanup.
 */
const useWebSocket = (url, options = {}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isMountedRef = useRef(true);
    const { token } = useAuth();

    const {
        autoReconnect = true,
        reconnectInterval = 3000,
        onOpen,
        onMessage,
        onClose,
        onError,
    } = options;

    // Construir URL con token
    const getWsUrl = useCallback(() => {
        if (!url) return null;
        const separator = url.includes('?') ? '&' : '?';
        return token ? `${url}${separator}token=${token}` : url;
    }, [url, token]);

    // Conectar
    const connect = useCallback(() => {
        const wsUrl = getWsUrl();
        if (!wsUrl || !isMountedRef.current) return;

        // Cerrar conexión existente si hay
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return; // Ya conectado
        }

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = (event) => {
                if (!isMountedRef.current) {
                    wsRef.current?.close();
                    return;
                }
                setIsConnected(true);
                setError(null);
                onOpen?.(event);
            };

            wsRef.current.onmessage = (event) => {
                if (!isMountedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    onMessage?.(data);
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e);
                }
            };

            wsRef.current.onclose = (event) => {
                if (!isMountedRef.current) return;
                setIsConnected(false);
                onClose?.(event);

                // Reconectar automáticamente solo si sigue montado y no fue cierre limpio
                if (autoReconnect && !event.wasClean && isMountedRef.current) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (isMountedRef.current) {
                            connect();
                        }
                    }, reconnectInterval);
                }
            };

            wsRef.current.onerror = (event) => {
                if (!isMountedRef.current) return;
                setError('Error de conexión WebSocket');
                onError?.(event);
            };
        } catch (e) {
            if (isMountedRef.current) {
                setError(e.message);
            }
        }
    }, [getWsUrl, autoReconnect, reconnectInterval, onOpen, onMessage, onClose, onError]);

    // Desconectar
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            // Usar código 1000 para cierre limpio
            if (wsRef.current.readyState === WebSocket.OPEN || 
                wsRef.current.readyState === WebSocket.CONNECTING) {
                wsRef.current.close(1000, 'Component unmounted');
            }
            wsRef.current = null;
        }
    }, []);

    // Enviar mensaje
    const sendMessage = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    // Conectar al montar, desconectar al desmontar
    useEffect(() => {
        isMountedRef.current = true;
        
        if (url) {
            connect();
        }
        
        return () => {
            isMountedRef.current = false;
            disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, token]); // Solo reconectar si cambia la URL o el token

    return {
        isConnected,
        lastMessage,
        error,
        sendMessage,
        connect,
        disconnect,
    };
};


/**
 * Hook para el canal general de subastas.
 * Recibe notificaciones de todas las subastas.
 */
export const useSubastasWebSocket = (options = {}) => {
    const [subastaCreada, setSubastaCreada] = useState(null);
    const [subastaActualizada, setSubastaActualizada] = useState(null);
    const [subastaCancelada, setSubastaCancelada] = useState(null);
    const [subastaEliminada, setSubastaEliminada] = useState(null);
    const [subastaIniciada, setSubastaIniciada] = useState(null);
    const [subastaFinalizada, setSubastaFinalizada] = useState(null);

    const {
        onSubastaCreada,
        onSubastaActualizada,
        onSubastaCancelada,
        onSubastaEliminada,
        onSubastaIniciada,
        onSubastaFinalizada,
        ...wsOptions
    } = options;

    const handleMessage = useCallback((data) => {
        switch (data.tipo) {
            case 'subasta_creada':
                setSubastaCreada(data.subasta);
                onSubastaCreada?.(data.subasta, data.mensaje);
                break;
            case 'subasta_actualizada':
                setSubastaActualizada(data.subasta);
                onSubastaActualizada?.(data.subasta, data.cambios);
                break;
            case 'subasta_cancelada':
                setSubastaCancelada(data);
                onSubastaCancelada?.(data.subasta, data.participantes_afectados);
                break;
            case 'subasta_eliminada':
                setSubastaEliminada(data);
                onSubastaEliminada?.(data.subasta_id, data.mensaje);
                break;
            case 'subasta_iniciada':
                setSubastaIniciada(data.subasta);
                onSubastaIniciada?.(data.subasta);
                break;
            case 'subasta_finalizada':
                setSubastaFinalizada(data);
                onSubastaFinalizada?.(data.subasta, data.ganador, data.monto_final);
                break;
            default:
                break;
        }
    }, [onSubastaCreada, onSubastaActualizada, onSubastaCancelada, onSubastaEliminada, onSubastaIniciada, onSubastaFinalizada]);

    const ws = useWebSocket(`${WS_BASE_URL}/ws/subastas/`, {
        ...wsOptions,
        onMessage: handleMessage,
    });

    // Limpiar estados después de un tiempo
    useEffect(() => {
        if (subastaCreada) {
            const timer = setTimeout(() => setSubastaCreada(null), 10000);
            return () => clearTimeout(timer);
        }
    }, [subastaCreada]);

    return {
        ...ws,
        subastaCreada,
        subastaActualizada,
        subastaCancelada,
        subastaEliminada,
        subastaIniciada,
        subastaFinalizada,
    };
};


/**
 * Hook para el detalle de una subasta específica.
 * Recibe pujas en tiempo real.
 */
export const useSubastaDetalleWebSocket = (subastaId, options = {}) => {
    const [subasta, setSubasta] = useState(null);
    const [nuevaPuja, setNuevaPuja] = useState(null);
    const [pujaSuperada, setPujaSuperada] = useState(null);
    const [tiempoRestante, setTiempoRestante] = useState(null);
    const [finalizada, setFinalizada] = useState(false);
    const [cancelada, setCancelada] = useState(false);

    const {
        onNuevaPuja,
        onPujaSuperada,
        onSubastaFinalizada,
        onSubastaCancelada,
        ...wsOptions
    } = options;

    const handleMessage = useCallback((data) => {
        switch (data.tipo) {
            case 'conexion_establecida':
                setSubasta(data.subasta);
                break;
            case 'estado_actual':
                setSubasta(data.subasta);
                break;
            case 'nueva_puja':
                setNuevaPuja(data.puja);
                setSubasta(prev => prev ? {
                    ...prev,
                    precio_actual: data.precio_actual,
                    total_ofertas: data.total_pujas
                } : null);
                onNuevaPuja?.(data.puja, data.precio_actual);
                break;
            case 'puja_superada':
                setPujaSuperada(data);
                onPujaSuperada?.(data.cliente_superado_id, data.nueva_puja);
                break;
            case 'tiempo_actualizado':
                setTiempoRestante(data.segundos_restantes);
                break;
            case 'subasta_finalizada':
                setFinalizada(true);
                onSubastaFinalizada?.(data.ganador, data.monto_final);
                break;
            case 'subasta_cancelada':
                setCancelada(true);
                onSubastaCancelada?.(data.mensaje);
                break;
            default:
                break;
        }
    }, [onNuevaPuja, onPujaSuperada, onSubastaFinalizada, onSubastaCancelada]);

    const url = subastaId ? `${WS_BASE_URL}/ws/subasta/${subastaId}/` : null;
    const ws = useWebSocket(url, {
        ...wsOptions,
        onMessage: handleMessage,
    });

    // Solicitar estado actual
    const requestState = useCallback(() => {
        ws.sendMessage({ tipo: 'solicitar_estado' });
    }, [ws]);

    // Limpiar estado de nueva puja después de un tiempo
    useEffect(() => {
        if (nuevaPuja) {
            const timer = setTimeout(() => setNuevaPuja(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [nuevaPuja]);

    return {
        ...ws,
        subasta,
        nuevaPuja,
        pujaSuperada,
        tiempoRestante,
        finalizada,
        cancelada,
        requestState,
    };
};


export default useWebSocket;
