/**
 * Contexto para WebSocket de Subastas.
 * 
 * Proporciona eventos de WebSocket a toda la aplicación para que
 * los componentes puedan reaccionar a cambios en tiempo real.
 * 
 * Uso:
 * 
 * // En un componente
 * const { subastaCreada, subastaCancelada, onRefreshNeeded } = useSubastasContext();
 * 
 * useEffect(() => {
 *   // Recargar datos cuando hay cambios
 *   if (subastaCreada || subastaCancelada) {
 *     fetchData();
 *   }
 * }, [subastaCreada, subastaCancelada]);
 * 
 * // O suscribirse al callback
 * useEffect(() => {
 *   const unsubscribe = onRefreshNeeded(() => {
 *     fetchData();
 *   });
 *   return unsubscribe;
 * }, []);
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useSubastasWebSocket } from '../hooks/useWebSocket';
import { actualizarEstadosSubastas } from '../api/subastas';

const SubastasWSContext = createContext(null);

// Intervalo de polling para verificar cambios de estado (30 segundos)
const POLLING_INTERVAL = 30000;

export const SubastasWSProvider = ({ children }) => {
    // Estados de eventos
    const [subastaCreada, setSubastaCreada] = useState(null);
    const [subastaActualizada, setSubastaActualizada] = useState(null);
    const [subastaCancelada, setSubastaCancelada] = useState(null);
    const [subastaEliminada, setSubastaEliminada] = useState(null);
    const [subastaIniciada, setSubastaIniciada] = useState(null);
    const [subastaFinalizada, setSubastaFinalizada] = useState(null);
    const [nuevaPuja, setNuevaPuja] = useState(null);
    
    // Contador de cambios para forzar re-renders
    const [refreshCounter, setRefreshCounter] = useState(0);
    
    // Callbacks de suscriptores
    const subscribersRef = useRef(new Set());

    // Notificar a todos los suscriptores
    const notifySubscribers = useCallback((eventType, data) => {
        subscribersRef.current.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (e) {
                console.error('Error en subscriber de WebSocket:', e);
            }
        });
        // Incrementar contador para forzar actualizaciones
        setRefreshCounter(prev => prev + 1);
    }, []);

    // Función para suscribirse a eventos de refresh
    const onRefreshNeeded = useCallback((callback) => {
        subscribersRef.current.add(callback);
        // Retornar función de unsuscribe
        return () => {
            subscribersRef.current.delete(callback);
        };
    }, []);

    // Handlers para WebSocket
    const handleSubastaCreada = useCallback((subasta, mensaje) => {
        setSubastaCreada({ subasta, mensaje, timestamp: Date.now() });
        notifySubscribers('subasta_creada', subasta);
    }, [notifySubscribers]);

    const handleSubastaActualizada = useCallback((subasta, cambios) => {
        setSubastaActualizada({ subasta, cambios, timestamp: Date.now() });
        notifySubscribers('subasta_actualizada', subasta);
    }, [notifySubscribers]);

    const handleSubastaCancelada = useCallback((subasta, participantes) => {
        setSubastaCancelada({ subasta, participantes, timestamp: Date.now() });
        notifySubscribers('subasta_cancelada', subasta);
    }, [notifySubscribers]);

    const handleSubastaEliminada = useCallback((subastaId, mensaje) => {
        setSubastaEliminada({ subastaId, mensaje, timestamp: Date.now() });
        notifySubscribers('subasta_eliminada', { subastaId, mensaje });
    }, [notifySubscribers]);

    const handleSubastaIniciada = useCallback((subasta) => {
        setSubastaIniciada({ subasta, timestamp: Date.now() });
        notifySubscribers('subasta_iniciada', subasta);
    }, [notifySubscribers]);

    const handleSubastaFinalizada = useCallback((subasta, ganador, montoFinal) => {
        setSubastaFinalizada({ subasta, ganador, montoFinal, timestamp: Date.now() });
        notifySubscribers('subasta_finalizada', subasta);
    }, [notifySubscribers]);

    // Conectar WebSocket
    const { isConnected, error } = useSubastasWebSocket({
        onSubastaCreada: handleSubastaCreada,
        onSubastaActualizada: handleSubastaActualizada,
        onSubastaCancelada: handleSubastaCancelada,
        onSubastaEliminada: handleSubastaEliminada,
        onSubastaIniciada: handleSubastaIniciada,
        onSubastaFinalizada: handleSubastaFinalizada,
    });

    // Limpiar estados después de un tiempo
    useEffect(() => {
        const timers = [];
        
        if (subastaCreada) {
            timers.push(setTimeout(() => setSubastaCreada(null), 10000));
        }
        if (subastaCancelada) {
            timers.push(setTimeout(() => setSubastaCancelada(null), 10000));
        }
        if (subastaEliminada) {
            timers.push(setTimeout(() => setSubastaEliminada(null), 10000));
        }
        
        return () => timers.forEach(clearTimeout);
    }, [subastaCreada, subastaCancelada, subastaEliminada]);

    // Polling para detectar cambios de estado automáticos
    // (PROGRAMADA -> ACTIVA -> FINALIZADA basado en fechas)
    useEffect(() => {
        // Solo hacer polling si está conectado
        if (!isConnected) return;

        const checkEstados = async () => {
            try {
                await actualizarEstadosSubastas();
                // Si hay cambios, el backend envía WebSocket notifications
            } catch (err) {
                // Silenciar errores de polling (no crítico)
                console.debug('Polling estados:', err.message);
            }
        };

        // Verificar inmediatamente al conectar
        checkEstados();
        
        // Configurar polling periódico
        const interval = setInterval(checkEstados, POLLING_INTERVAL);
        
        return () => clearInterval(interval);
    }, [isConnected]);

    const value = {
        // Estado de conexión
        isConnected,
        error,
        
        // Eventos (null si no hay evento reciente)
        subastaCreada,
        subastaActualizada,
        subastaCancelada,
        subastaEliminada,
        subastaIniciada,
        subastaFinalizada,
        nuevaPuja,
        
        // Contador de cambios (útil para dependencias de useEffect)
        refreshCounter,
        
        // Función para suscribirse a cambios
        onRefreshNeeded,
    };

    return (
        <SubastasWSContext.Provider value={value}>
            {children}
        </SubastasWSContext.Provider>
    );
};

// Hook para usar el contexto
export const useSubastasContext = () => {
    const context = useContext(SubastasWSContext);
    if (!context) {
        throw new Error('useSubastasContext debe usarse dentro de SubastasWSProvider');
    }
    return context;
};

// Hook simplificado para auto-refresh (más fácil de usar en componentes)
export const useAutoRefresh = (fetchFunction, deps = []) => {
    const { refreshCounter } = useSubastasContext();
    
    useEffect(() => {
        if (refreshCounter > 0) {
            fetchFunction();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshCounter, ...deps]);
};

export default SubastasWSContext;
