namespace AJ {
    export class ConnectorWebSocket extends ConnectorBase {

        m_socket: any;

        protected ConnectTransport() {
            var _this_ = this;
            this.m_socket = new WebSocket("ws://localhost:8088/", "binary");
            this.m_socket.binaryType = "arraybuffer";

            this.m_socket.onopen = function (event: any) {
                _this_.OnTransportConnected(true);
            }

            this.m_socket.onmessage = function (e: any) {
                _this_.OnDataReceived(new Uint8Array(e.data));
            }

            this.m_socket.onerror = function (e: any) {
                _this_.OnTransportConnected(false);
            }
        }

        protected DisconnectTransport() {
            if (this.m_socket != null) {
                (this.m_socket as WebSocket).close();
                this.m_socket = null;
            }
        }

        protected WriteData(data: Uint8Array) {
            this.m_socket.send(data);
        }

        private OnSendSuccess() {
            console.log("SEND SUCCESS");
        }

        private OnSendFailed() {
            console.log("SEND FAILED");
        }

        protected ReadData() {
            // nothing to do in this implementation
        }
    }
}
