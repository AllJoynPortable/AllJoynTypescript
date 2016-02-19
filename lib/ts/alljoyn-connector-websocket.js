var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AJ;
(function (AJ) {
    var ConnectorWebSocket = (function (_super) {
        __extends(ConnectorWebSocket, _super);
        function ConnectorWebSocket() {
            _super.apply(this, arguments);
        }
        ConnectorWebSocket.prototype.ConnectTransport = function () {
            var _this_ = this;
            this.m_socket = new WebSocket("ws://localhost:8088/", "binary");
            this.m_socket.binaryType = "arraybuffer";
            this.m_socket.onopen = function (event) {
                _this_.OnTransportConnected(true);
            };
            this.m_socket.onmessage = function (e) {
                _this_.OnDataReceived(new Uint8Array(e.data));
            };
            this.m_socket.onerror = function (e) {
                _this_.OnTransportConnected(false);
            };
        };
        ConnectorWebSocket.prototype.DisconnectTransport = function () {
            if (this.m_socket != null) {
                this.m_socket.close();
                this.m_socket = null;
            }
        };
        ConnectorWebSocket.prototype.WriteData = function (data) {
            this.m_socket.send(data);
        };
        ConnectorWebSocket.prototype.OnSendSuccess = function () {
            console.log("SEND SUCCESS");
        };
        ConnectorWebSocket.prototype.OnSendFailed = function () {
            console.log("SEND FAILED");
        };
        ConnectorWebSocket.prototype.ReadData = function () {
            // nothing to do in this implementation
        };
        return ConnectorWebSocket;
    }(AJ.ConnectorBase));
    AJ.ConnectorWebSocket = ConnectorWebSocket;
})(AJ || (AJ = {}));
//# sourceMappingURL=alljoyn-connector-websocket.js.map