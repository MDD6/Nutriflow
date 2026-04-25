class ChatRealtimeService {
  constructor() {
    this.channels = new Map();
    this.nextConnectionId = 1;
    this.heartbeatIntervalMs = 25000;
  }

  buildPatientChannelKey(patientProfileId) {
    return `patient-profile:${patientProfileId}`;
  }

  subscribeToPatientProfile(request, response, patientProfileId) {
    const channelKey = this.buildPatientChannelKey(patientProfileId);
    const connectionId = this.nextConnectionId;
    this.nextConnectionId += 1;

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    const connections = this.channels.get(channelKey) || new Map();
    const connection = {
      id: connectionId,
      response,
      heartbeat: null,
    };

    connection.heartbeat = setInterval(() => {
      this.writeSseFrame(response, null, null, ': ping');
    }, this.heartbeatIntervalMs);

    connections.set(connectionId, connection);
    this.channels.set(channelKey, connections);

    this.writeEvent(channelKey, response, 'connected', {
      patientProfileId,
    });

    const cleanup = () => {
      const activeConnections = this.channels.get(channelKey);

      if (!activeConnections?.has(connectionId)) {
        return;
      }

      clearInterval(connection.heartbeat);
      activeConnections.delete(connectionId);

      if (!activeConnections.size) {
        this.channels.delete(channelKey);
      }
    };

    request.on('close', cleanup);
    request.on('end', cleanup);
    response.on('close', cleanup);
  }

  publishChatUpdated(patientProfileId, payload = {}) {
    const channelKey = this.buildPatientChannelKey(patientProfileId);
    const connections = this.channels.get(channelKey);

    if (!connections?.size) {
      return;
    }

    for (const connection of connections.values()) {
      this.writeEvent(channelKey, connection.response, 'chat-updated', {
        patientProfileId,
        occurredAt: new Date().toISOString(),
        ...payload,
      });
    }
  }

  writeEvent(channelKey, response, eventName, payload) {
    try {
      this.writeSseFrame(response, eventName, payload);
    } catch (error) {
      const connections = this.channels.get(channelKey);

      if (!connections) {
        return;
      }

      for (const [connectionId, connection] of connections.entries()) {
        if (connection.response === response) {
          clearInterval(connection.heartbeat);
          connections.delete(connectionId);
          break;
        }
      }

      if (!connections.size) {
        this.channels.delete(channelKey);
      }
    }
  }

  writeSseFrame(response, eventName, payload, rawLine = '') {
    if (rawLine) {
      response.write(`${rawLine}\n\n`);
      return;
    }

    if (eventName) {
      response.write(`event: ${eventName}\n`);
    }

    response.write(`data: ${JSON.stringify(payload || {})}\n\n`);
  }
}

module.exports = {
  ChatRealtimeService,
};
