let socket = null;

export const connectSocket = (onMessage) => {
    socket = new WebSocket('ws://localhost:8000/ws/map/');

    socket.onopen = () => {
        console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessage(data);
    };

    socket.onclose = () => {
        console.log('WebSocket disconnected');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
};

export const disconnectSocket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};