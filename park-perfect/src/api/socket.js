let socket = null;
export const connect_socket = (on_message) => {
    socket = new WebSocket('ws://localhost:8000/ws/map/');

    socket.onopen = () => {
        console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        on_message(data);
    };

    socket.onclose = () => {
        console.log('WebSocket disconnected');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
};

export const disconnect_socket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};

