namespace AJ {

    enum ConnectorState {
        StateDisconnected,
        StateTransportConnecting,
        StateAuthAnonumousSent,
        StateInformProtoVersionSent,
        StateBeginSent,
        StateHelloSent,
        StateConnected
    };

    export enum ConnectorEventType {
        ConnectorEventNone,
        ConnectorEventConnected,
        ConnectorEventConnectionFailed,
        ConnectorEventProcessRequested,
        ConnectorEventTextReceived,
        ConnectorEventTextSent,
        ConnectorEventMsgReceived,
        ConnectorEventMsgSent,
        ConnectorEventMsgReplyReceived,
        ConnectorEventMsgReplySent
    };

    export abstract class ConnectorBase {

        protected abstract ConnectTransport();
        protected abstract DisconnectTransport();
        protected abstract WriteData(data: Uint8Array);
        protected abstract ReadData();

        public ConnectAndAuthenticate() {
            this.m_State = ConnectorState.StateTransportConnecting;

            this.ConnectTransport();
        }

        public Disconnect() {
            this.DisconnectTransport();
        }

        public SetApplication(application: ApplicationBase): void {
            this.m_Application = application;
        }

        public GetApplication(): ApplicationBase {
            return this.m_Application;
        }

        public GetLocalNodeId(): string {
            return this.m_LocalNodeId;
        }

        public SetAnnouncementListener(listener: (sender: string, q1: number, q2: number, o1: any, o2: any) => void) {
            this.m_AnnouncementListener = listener;
        }

        public NotifyAnnouncement(sender: string, q1: number, q2: number, o1: number, o2: number) {
            if (this.m_AnnouncementListener != null) {
                this.m_AnnouncementListener(sender, q1, q2, o1, o2);
            }
        }

        protected OnTransportConnected(ok: boolean) {
            if (ok) {
                this.m_State = ConnectorState.StateAuthAnonumousSent;
                this.SendLine("\0");
                this.SendLine("AUTH ANONYMOUS\r\n");

                this.ReadData();
            }
            else {
                this.m_State = ConnectorState.StateDisconnected;
                this.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnectionFailed, null);
            }
        }

        protected OnDataReceived(data: Uint8Array) {

            if (null != this.m_Buffer) {
                var a: Uint8Array = new Uint8Array(this.m_Buffer.length + data.length);
                var offset: number = this.m_Buffer.length;

                for (var i: number = 0; i < offset; i++)
                    a[i] = this.m_Buffer[i];

                for (var i: number = 0; i < data.length; i++)
                    a[i + offset] = data[i];

                this.m_Buffer = a;
            }
            else {
                this.m_Buffer = data;
            }

            this.Process();
        }

        Process() {
            // first distribute all outstanding event notifications
            //List < ConnectorEvent > l = m_QueuedEvents;
            //m_QueuedEvents = new List<ConnectorEvent>();

            //foreach(ConnectorEvent e in l)
            // {
            //    NotifyConnectorEvent(e.type, e.data);
            //}

            if (null == this.m_Buffer)
                return;

            if (ConnectorState.StateAuthAnonumousSent == this.m_State) {
                var line: string = this.ReceiveLine();

                if (line.substr(0, 3) == "OK ") {
                    this.SendLine("INFORM_PROTO_VERSION 12\r\n");
                    this.m_State = ConnectorState.StateInformProtoVersionSent;
                }
            }
            else if (ConnectorState.StateInformProtoVersionSent == this.m_State) {
                var line: string = this.ReceiveLine();

                if (line.substr(0, 21) == "INFORM_PROTO_VERSION ") {
                    this.SendLine("BEGIN 0d720fe995bc54ff15c00e9af0b20140\r\n");

                    this.m_Buffer = null;

                    this.m_State = ConnectorState.StateHelloSent;

                    this.SendHello();
                }
            }
            else {

                while (this.m_Buffer != null) {

                    // try to decode next message
                    var msg: AJ.MsgGeneric = new AJ.MsgGeneric(AJ.MsgType.Unknown);
                    var length = msg.FromBuffer(this.m_Buffer);
                    if (0 == length)
                        break;

                    this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgReceived, msg);

                    var t: MsgType = msg.hdr_GetMsgType();

                    if ((MsgType.Signal == t) || (MsgType.MethodCall == t)) {
                        var iface: string = msg.hdr_GetInterface();
                        if (iface == "org.freedesktop.DBus.Peer") org_freedesktop_dbus_peer._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Introspectable") org_freedesktop_dbus_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.allseen.Introspectable") org_allseen_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.About") org_alljoyn_about._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Icon") org_alljoyn_icon._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus") org_freedesktop_dbus._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus") org_alljoyn_bus._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Properties") org_freedesktop_dbus_properties._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Daemon") org_alljoyn_daemon._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Session") org_alljoyn_bus_peer_session._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Authentication") org_alljoyn_bus_peer_authentication._ProcessMsg(this, msg);
                        else if (null != this.m_Application) this.m_Application._ProcessMsg(this, msg);

                        if (msg.m_Reply != null) this.SendMsg(msg.m_Reply);
                    }
                    else if (t == MsgType.MethodReturn) {
                        var i: number = 0;
                        var sent: MsgGeneric = null;

                        if (this.m_AssignedBusName == "") {
                            this.m_AssignedBusName = msg.hdr_GetSender();
                        }

                        while (i < this.m_CalledMethods.length) {

                            if (this.m_CalledMethods[i].hdr_GetSerialNumber() == msg.hdr_GetReplySerial()) {
                                sent = this.m_CalledMethods[i];
                                this.m_CalledMethods[i] = this.m_CalledMethods[this.m_CalledMethods.length - 1];
                                this.m_CalledMethods.pop();
                                break;
                            }
                            i++;
                        }

                        if ((null != sent) && (null != sent.m_ReplyCb)) {
                            sent.m_Reply = msg;
                            sent.m_ReplyCb();
                        }
                    }
                    else if (t == MsgType.Error) {
                        console.log("XXX - ERROR " + msg.hdr_GetErrorName());
                    }

                    // update buffer
                    if (length < this.m_Buffer.length) {
                        var old_buffer: Uint8Array = this.m_Buffer;
                        this.m_Buffer = new Uint8Array(old_buffer.length - length);

                        for (var i: number = 0; i < old_buffer.length - length; i++)
                            this.m_Buffer[i] = old_buffer[length + i];
                    }
                    else {
                        this.m_Buffer = null;
                    }
                }
            }
        }

        private SendHello() {
            var __this__ = this;
            org_freedesktop_dbus.method__Hello(this,
                function (connection: ConnectorBase, bus: string) {

                    __this__.m_LocalNodeId = bus;
                    __this__.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnected, null);

                    __this__.m_State = ConnectorState.StateConnected;

                    if (__this__.m_Application != null) {
                        __this__.BindSessionPort();
                    } else {
                        __this__.AttachSession();
                    }

                    if (__this__.m_AnnouncementListener != null) {
                        org_freedesktop_dbus.method__AddMatch(__this__, "org.alljoyn.About", "Announce", null);
                    }
                }
            );
        }

        private BindSessionPort() {
            var __this__ = this;
            org_alljoyn_bus.method__BindSessionPort(this, 2, 0,
                function (connection: ConnectorBase, disposition: any, portOut: number) {
                    org_alljoyn_about.signal__Announce(connection, 1, 2, null, null);
                }
            );
        }

        private AttachSession() {
        }

        private SendLine(buffer: string) {
            var a: Uint8Array = new Uint8Array(buffer.length);

            for (var i: number = 0; i < buffer.length; i++)
                a[i] = buffer.charCodeAt(i);

            this.WriteData(a);

            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextSent, buffer);
        }

        private ReceiveLine(): string {
            // XXX - this is not quite correct
            var line: string = String.fromCharCode.apply(null, this.m_Buffer);

            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextReceived, line);

            // XXX - this is not correct either
            this.m_Buffer = null;

            return line;
        }

        public SendMsg(msg: AJ.MsgGeneric) {
            var buffer: Uint8Array = msg.GetBuffer();
            this.WriteData(buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgSent, msg);
        }

        public SendMsgWithCallback(msg: AJ.MsgGeneric, cb) {
            msg.m_ReplyCb = cb;
            this.m_CalledMethods.push(msg);
            this.SendMsg(msg);
        }

        public SetConnectorEvent(e: (e: ConnectorEventType, d: any) => void) {
            this.m_EventHandler = e;
        }

        private QueueConnectorEvent(e: ConnectorEventType, d: any) {
            // XXX - no queue for timebeing
            this.NotifyConnectorEvent(e, d);
        }

        private NotifyConnectorEvent(e: ConnectorEventType, d: any) {
            if (null != this.m_EventHandler) {
                this.m_EventHandler(e, d);
            }
        }

        private m_State: ConnectorState;
        protected m_Buffer: Uint8Array = null;
        private m_LocalNodeId: string = "";
        private m_AssignedBusName: string = "";
        private m_PeerNodeId: string = "";
        private m_EventHandler: (e: ConnectorEventType, d: any) => void = null;
        private m_CalledMethods: Array<MsgGeneric> = new Array<MsgGeneric>();
        private m_Application: ApplicationBase = null;
        private m_AnnouncementListener: (sender: string, q1: number, q2: number, o1: any, o2: any) => void = null;
    };

    //==============================================================================================================
    // org.alljoyn.About - producer
    //==============================================================================================================
    class org_alljoyn_about {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "GetAboutData") {
                return this.__process__GetAboutData(connection, msg);
            }
            else if (member == "GetObjectDescription") {
                return this.__process__GetObjectDescription(connection, msg);
            }
            else if (member == "Announce") {
                return this.__process__Announce(connection, msg);
            }

            return false;
        }

        private static __process__GetAboutData(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var ret: any = this.handle__GetAboutData(connection, s1);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static __process__GetObjectDescription(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: any = this.handle__GetObjectDescription(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(oas)");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static __process__Announce(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var q1: number = msg.body_Read_Q();
            var q2: number = msg.body_Read_Q();
            var o1: any = msg.body_ReadObject("a(oas)");
            var o2: any = msg.body_ReadObject("a{sv}");
            this.handle__Announce(connection, msg.hdr_GetSender(), q1, q2, o1, o2);

            return true;
        }

        public static signal__Announce(connection, q1: number, q2: number, o1: any, o2: any): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            var application: ApplicationBase = connection.GetApplication();
            msg.hdr_SetSessionless(true);
            msg.hdr_SetObjectPath("/About");
            msg.hdr_SetInterface("org.alljoyn.About");
            msg.hdr_SetMember("Announce");
            msg.hdr_SetSignature("qqa(oas)a{sv}");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(q1);
            msg.body_Write_Q(q2);

            
            // at this time we will write array elements manually
            //msg.body_WriteObject("a(oas)", [
            msg.body_Write_AROAS([
                ["/About", ["org.alljoyn.About"]],
                ["/About/DeviceIcon", ["org.alljoyn.Icon"]],
                ["/" + application.GetNodeName(), ["org.allmake." + application.GetInterfaceName()]]]);
            
            msg.body_Write_A_Start();

            msg.body_Write_R_Start();
            msg.body_Write_S("AppId");
            msg.body_Write_V(application.GetId(), "ay");

            msg.body_Write_R_Start();
            msg.body_Write_S("AppName");
            msg.body_Write_V(application.GetName(), "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("DeviceId");
            msg.body_Write_V(application.GetDeviceId(), "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("DeviceName");
            msg.body_Write_V(application.GetDeviceName(), "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("Manufacturer");
            msg.body_Write_V(application.GetManufacturer(), "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("ModelNumber");
            msg.body_Write_V(application.GetModelNumber(), "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("SupportedLanguages");
            msg.body_Write_V(new Array<string>("en"), "as");

            msg.body_Write_R_Start();
            msg.body_Write_S("Description");
            msg.body_Write_V(application.GetDescription(), "s");

            msg.body_Write_R_Start();
            msg.body_Write_S("DefaultLanguage");
            msg.body_Write_V("en", "s");

            msg.body_Write_A_End(true);

            connection.SendMsg(msg);
        }

        private static handle__GetAboutData(connection: ConnectorBase, s1: string): any {
            return 0;
        }

        private static handle__GetObjectDescription(connection): any {
            return 0;
        }

        private static handle__Announce(connection: ConnectorBase, sender: string, q1: number, q2: number, o1: any, o2: any): void {
            connection.NotifyAnnouncement(sender, q1, q2, o1, o2);
        }
    }

    //==============================================================================================================
    // org.alljoyn.Icon - producer
    //==============================================================================================================

    class org_alljoyn_icon {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "GetUrl") {
                return this.__process__GetUrl(connection, msg);
            }
            else if (member == "GetContent") {
                return this.__process__GetContent(connection, msg);
            }

            return false;
        }

        public static __process__GetUrl(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: string = this.handle__GetUrl(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        public static __process__GetContent(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: Uint8Array = this.handle__GetContent(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);

            return true;
        }

        public static handle__GetUrl(connection): string {
            return "";
        }

        public static handle__GetContent(connection: ConnectorBase): Uint8Array {
            return connection.GetApplication().GetIcon();
        }
    }

    //==============================================================================================================
    // org.freedesktop.DBus.Properties - producer
    //==============================================================================================================
    class org_freedesktop_dbus_properties {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "Get") {
                return this.__process__Get(connection, msg);
            }
            else if (member == "Set") {
                return this.__process__Set(connection, msg);
            }
            else if (member == "GetAll") {
                return this.__process__GetAll(connection, msg);
            }

            return false;
        }

        private static __process__Get(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            var ret: any = this.handle__Get(connection, s1, s2);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();

            if (typeof (ret) == "string") {
                msg.m_Reply.body_Write_V(ret, "s");
            } else if (typeof (ret) == "number") {
                // XXX - why q??
                msg.m_Reply.body_Write_V(ret, "q");
            }
            return true;
        }

        private static __process__Set(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            var v1: any = null; //msg.body_ReadVariant(); // XXX - fix this
            this.handle__Set(connection, s1, s2, v1);

            msg.CreateReply();
            msg.m_Reply.body_StartWriting();

            return true;
        }

        private static __process__GetAll(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var ret: any = this.handle__GetAll(connection, s1);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static handle__Get(connection: ConnectorBase, s1: string, s2: string): any {
            var application: ApplicationBase = connection.GetApplication();

            if (s1 == "org.alljoyn.Icon") {
                if (s2 == "Version") {
                    return application.GetIconVersion();
                }
                else if (s2 == "MimeType") {
                    return application.GetIconMimeType();
                }
            }

            return 0;
        }

        private static handle__Set(connection: ConnectorBase, s1: string, s2: string, v1: any): void {
        }

        private static handle__GetAll(connection: ConnectorBase, s1: string): any {
            return 0;
        }
    }

    //==============================================================================================================
    // org.freedesktop.DBus.Introspectable - producer
    //==============================================================================================================

    export class org_freedesktop_dbus_introspectable {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "Introspect") {
                return this.__process__Introspect(connection, msg);
            }

            return false;
        }

        private static __process__Introspect(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: string = this.handle__Introspect(connection, msg.hdr_GetObjectPath());

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        public static handle__Introspect(connection: ConnectorBase, op: string): string {
            var ret: string = "";
            if (op == "/About") {
                ret =
                    "<node name=\"/About\">" +
                    "<interface name=\"org.freedesktop.DBus.Properties\" >" +
                    "<method name=\"Get\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"Set\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"in\" />" +
                    "</method>" +
                    "<method name= \"GetAll\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "<interface name= \"org.alljoyn.About\" >" +
                    "<property name=\"Version\" type= \"q\" access= \"read\" />" +
                    "<method name=\"GetAboutData\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"GetObjectDescription\" >" +
                    "<arg type=\"a(oas)\" direction= \"out\" />" +
                    "</method>" +
                    "<signal name= \"Announce\" >" +
                    "<arg type=\"q\" />" +
                    "<arg type=\"q\" />" +
                    "<arg type=\"a(oas)\" />" +
                    "<arg type=\"a{sv}\" />" +
                    "</signal>" +
                    "</interface>" +
                    "</node>";
            }
            else if (op == "/About/DeviceIcon") {
                ret =
                    "<node name=\"/About/DeviceIcon\" >" +
                    "<interface name=\"org.freedesktop.DBus.Properties\" >" +
                    "<method name=\"Get\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"Set\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"in\" />" +
                    "</method>" +
                    "<method name= \"GetAll\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "<interface name= \"org.alljoyn.Icon\" >" +
                    "<property name=\"Version\" type= \"q\" access= \"read\" />" +
                    "<property name=\"MimeType\" type= \"s\" access= \"read\" />" +
                    "<property name=\"Size\" type= \"u\" access= \"read\" />" +
                    "<method name=\"GetUrl\" >" +
                    "<arg type=\"s\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"GetContent\" >" +
                    "<arg type=\"ay\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "</node>";
            }
            else {
                ret = connection.GetApplication().GetIntrospectionXml();
            }

            return ret;
        }

        public static method__Introspect(connection: ConnectorBase, target: string, iface: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus.Introspectable");
            msg.hdr_SetObjectPath(iface);
            msg.hdr_SetDestination(target);
            msg.hdr_SetMember("Introspect");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var xml: string = msg.body_Read_S();
                    if (null != cb) cb(connection, xml);
                }
            );
        };


    }

    //==============================================================================================================
    // org.allseen.Introspectable - producer
    //==============================================================================================================

    class org_allseen_introspectable {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member = msg.hdr_GetMember();

            if (member == "GetDescriptionLanguages") {
                return this.__process__GetDescriptionLanguages(connection, msg);
            }
            else if (member == "IntrospectWithDescription") {
                return this.__process__IntrospectWithDescription(connection, msg);
            }

            return false;
        }

        private static __process__GetDescriptionLanguages(connection: ConnectorBase, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetDescriptionLanguages(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("as");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AS(ret);

            return true;
        }

        private static __process__IntrospectWithDescription(connection: ConnectorBase, msg) {
            msg.body_StartReading();
            var languageTag = msg.body_ReadString();
            var ret = this.handle__IntrospectWithDescription(connection, msg.hdr_GetObjectPath(), languageTag);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static handle__GetDescriptionLanguages(connection) {
            return ["en"];
        }

        private static handle__IntrospectWithDescription(connection: ConnectorBase, op: string, languageTag) {
            // ignore language tag
            return org_freedesktop_dbus_introspectable.handle__Introspect(connection, op);
        }
    };

    //==============================================================================================================
    // org.freedesktop.DBus.Peer - producer
    //==============================================================================================================

    class org_freedesktop_dbus_peer {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "Ping") {
                return this.__process__Ping(connection, msg);
            }
            else if (member == "GetMachineId") {
                return this.__process__GetMachineId(connection, msg);
            }

            return false;
        }

        private static __process__Ping(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            this.handle__Ping(connection);

            msg.CreateReply();
            msg.m_Reply.body_StartWriting();

            return true;
        }

        private static __process__GetMachineId(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var ret: string = this.handle__GetMachineId(connection);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static handle__Ping(connection): void {
        }

        private static handle__GetMachineId(connection): string {
            return "default-string";
        }
    }

    //==============================================================================================================
    // org.freedesktop.DBus - consumer
    //==============================================================================================================

    class org_freedesktop_dbus {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "NameOwnerChanged") {
                return this.__process__NameOwnerChanged(connection, msg);
            }
            if (member == "NameLost") {
                return this.__process__NameLost(connection, msg);
            }
            if (member == "NameAcquired") {
                return this.__process__NameAcquired(connection, msg);
            }

            return false;
        }

        private static __process__NameOwnerChanged(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            var s2: string = msg.body_Read_S();
            var s3: string = msg.body_Read_S();
            this.handle__NameOwnerChanged(connection, s1, s2, s3);

            return true;
        }

        private static __process__NameLost(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            this.handle__NameLost(connection, s1);

            return true;
        }

        private static __process__NameAcquired(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var s1: string = msg.body_Read_S();
            this.handle__NameAcquired(connection, s1);

            return true;
        }

        public static method__RequestName(connection: ConnectorBase, s1: string, u1: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RequestName");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_U(u1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var u2: number = msg.body_Read_U();
                    if (null != cb) cb(connection, u2);
                }
            );
        };

        public static method__ReleaseName(connection, s1: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("ReleaseName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var u1: number = msg.body_Read_U();
                    if (null != cb) cb(connection, u1);
                }
            );
        };

        public static method__Hello(connection: ConnectorBase, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("Hello");
            msg.SetFlags(6);
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var s1: string = msg.body_Read_S();
                    if (null != cb) cb(connection, s1);
                }
            );
        };

        public static method__NameHasOwner(connection: ConnectorBase, s1: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameHasOwner");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var b1: boolean = msg.body_Read_B();
                    if (null != cb) cb(connection, b1);
                }
            );
        };

        public static method__AddMatch(connection: ConnectorBase, iface: string, member: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("AddMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S("type='signal',interface='" + iface + "',member='" + member + "'");
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    if (null != cb) cb(connection);
                }
            );
        };

        public static method__RemoveMatch(connection: ConnectorBase, s1: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RemoveMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    if (null != cb) cb(connection);
                }
            );
        };

        public static signal__NameOwnerChanged(connection: ConnectorBase, s1: string, s2: string, s3: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameOwnerChanged");
            msg.hdr_SetSignature("sss");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_S(s2);
            msg.body_Write_S(s3);
            connection.SendMsg(msg);
        };

        public static signal__NameLost(connection: ConnectorBase, s1: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameLost");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };

        public static signal__NameAcquired(connection: ConnectorBase, s1: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameAcquired");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };

        private static handle__NameOwnerChanged(connection: ConnectorBase, s1: string, s2: string, s3: string): void {
        };

        private static handle__NameLost(connection: ConnectorBase, s1: string): void {
        };

        private static handle__NameAcquired(connection: ConnectorBase, s1: string): void {
        };
    };

    //==============================================================================================================
    // org.alljoyn.Bus - consumer
    //==============================================================================================================
    class org_alljoyn_bus {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "FoundAdvertisedName") {
                return this.__process__FoundAdvertisedName(connection, msg);
            }
            else if (member == "LostAdvertisedName") {
                return this.__process__LostAdvertisedName(connection, msg);
            }
            else if (member == "MPSessionChanged") {
                return this.__process__MPSessionChanged(connection, msg);
            }
            else if (member == "MPSessionChangedWithReason") {
                return this.__process__MPSessionChangedWithReason(connection, msg);
            }
            else if (member == "SessionLost") {
                return this.__process__SessionLost(connection, msg);
            }
            else if (member == "SessionLostWithReason") {
                return this.__process__SessionLostWithReason(connection, msg);
            }
            else if (member == "SessionLostWithReasonAndDisposition") {
                return this.__process__SessionLostWithReasonAndDisposition(connection, msg);
            }

            return false;
        }

        private static __process__FoundAdvertisedName(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var name: string = msg.body_Read_S();
            var transport: number = msg.body_Read_Q();
            var prefix: string = msg.body_Read_S();
            this.handle__FoundAdvertisedName(connection, name, transport, prefix);

            return true;
        }

        private static __process__LostAdvertisedName(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var name: string = msg.body_Read_S();
            var transport: number = msg.body_Read_Q();
            var prefix: string = msg.body_Read_S();
            this.handle__LostAdvertisedName(connection, name, transport, prefix);

            return true;
        }

        private static __process__MPSessionChanged(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var name: string = msg.body_Read_S();
            var isAdded: boolean = msg.body_Read_B();
            this.handle__MPSessionChanged(connection, sessionId, name, isAdded);

            return true;
        }

        private static __process__MPSessionChangedWithReason(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var name: string = msg.body_Read_S();
            var isAdded: boolean = msg.body_Read_B();
            var reason: number = msg.body_Read_U();
            this.handle__MPSessionChangedWithReason(connection, sessionId, name, isAdded, reason);

            return true;
        }

        private static __process__SessionLost(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            this.handle__SessionLost(connection, sessionId);

            return true;
        }

        private static __process__SessionLostWithReason(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var reason: number = msg.body_Read_U();
            this.handle__SessionLostWithReason(connection, sessionId, reason);

            return true;
        }

        private static __process__SessionLostWithReasonAndDisposition(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sessionId: number = msg.body_Read_U();
            var reason: number = msg.body_Read_U();
            var disposition: number = msg.body_Read_U();
            this.handle__SessionLostWithReasonAndDisposition(connection, sessionId, reason, disposition);

            return true;
        }

        public static method__AdvertiseName(connection, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__AliasUnixUser(connection: ConnectorBase, aliasUID: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AliasUnixUser");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(aliasUID);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__BindSessionPort(connection: ConnectorBase, portIn: number, opts: any, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BindSessionPort");
            msg.hdr_SetSignature("qa{sv}");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(portIn);

            // XXX - just fixed options at the moment
            //msg.body_WriteObject(opts, "a{sv}");
            var ooo: Uint8Array = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x66, 0x00, 0x01, 0x79, 0x00, 0x01, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x6D, 0x75, 0x6C, 0x74, 0x69, 0x00, 0x01, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x70, 0x72, 0x6F, 0x78, 0x00, 0x01, 0x79, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x6E, 0x73, 0x00, 0x01, 0x71, 0x00, 0x00, 0x05, 0x01]);

            msg.body_Write_I(0x48);
            msg.body_WriteRaw(ooo);

            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var portOut: number = msg.body_Read_Q();
                    if (null != cb) cb(connection, disposition, portOut);
                }
            );
        };

        public static method__BusHello(connection: ConnectorBase, GUIDC: string, protoVerC: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BusHello");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(GUIDC);
            msg.body_Write_U(protoVerC);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var GUIDS: string = msg.body_Read_S();
                    var uniqueName: string = msg.body_Read_S();
                    var protoVerS: number = msg.body_Read_U();
                    if (null != cb) cb(connection, GUIDS, uniqueName, protoVerS);
                }
            );
        };

        public static method__CancelAdvertiseName(connection: ConnectorBase, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelAdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelFindAdvertisedName(connection: ConnectorBase, name: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelFindAdvertisedNameByTransport(connection: ConnectorBase, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelFindAdvertisementByTransport(connection: ConnectorBase, matching: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__CancelSessionlessMessage(connection: ConnectorBase, serialNum: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelSessionlessMessage");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(serialNum);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__FindAdvertisedName(connection: ConnectorBase, name: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__FindAdvertisedNameByTransport(connection: ConnectorBase, name: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__FindAdvertisementByTransport(connection: ConnectorBase, matching: string, transports: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static signal__FoundAdvertisedName(connection: ConnectorBase, name: string, transport: number, prefix: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FoundAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };

        public static method__GetHostInfo(connection: ConnectorBase, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("GetHostInfo");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var localipaddr: string = msg.body_Read_S();
                    var remoteipaddr: string = msg.body_Read_S();
                    if (null != cb) cb(connection, disposition, localipaddr, remoteipaddr);
                }
            );
        };

        public static method__JoinSession(connection: ConnectorBase, sessionHost: string, port: number, opts: any, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("JoinSession");
            msg.hdr_SetSignature("sqa{sv}");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(sessionHost);
            msg.body_Write_Q(port);
            msg.body_WriteObject("a{sv}", opts);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disp: number = msg.body_Read_U();
                    var sessionId: number = msg.body_Read_U();
                    var opts: any = msg.body_ReadObject("a{sv}");
                    if (null != cb) cb(connection, disp, sessionId, opts);
                }
            );
        };

        public static method__LeaveHostedSession(connection: ConnectorBase, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveHostedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__LeaveJoinedSession(connection, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveJoinedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__LeaveSession(connection: ConnectorBase, sessionId: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static signal__LostAdvertisedName(connection: ConnectorBase, name: string, transport: number, prefix: string): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LostAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };

        public static signal__MPSessionChanged(connection: ConnectorBase, sessionId: number, name: string, isAdded: boolean): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChanged");
            msg.hdr_SetSignature("usb");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            connection.SendMsg(msg);
        };

        public static signal__MPSessionChangedWithReason(connection: ConnectorBase, sessionId: number, name: string, isAdded: boolean, reason: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChangedWithReason");
            msg.hdr_SetSignature("usbu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };

        public static method__OnAppResume(connection: ConnectorBase, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppResume");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__OnAppSuspend(connection: ConnectorBase, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppSuspend");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__Ping(connection: ConnectorBase, name: string, timeout: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("Ping");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_U(timeout);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static method__ReloadConfig(connection: ConnectorBase, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("ReloadConfig");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var loaded: boolean = msg.body_Read_B();
                    if (null != cb) cb(connection, loaded);
                }
            );
        };

        public static method__RemoveSessionMember(connection: ConnectorBase, sessionId: number, name: string, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("RemoveSessionMember");
            msg.hdr_SetSignature("us");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        public static signal__SessionLost(connection: ConnectorBase, sessionId: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLost");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsg(msg);
        };

        public static signal__SessionLostWithReason(connection: ConnectorBase, sessionId: number, reason: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReason");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };

        public static signal__SessionLostWithReasonAndDisposition(connection: ConnectorBase, sessionId: number, reason: number, disposition: number): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReasonAndDisposition");
            msg.hdr_SetSignature("uuu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            msg.body_Write_U(disposition);
            connection.SendMsg(msg);
        };

        public static method__SetIdleTimeouts(connection: ConnectorBase, reqLinkTO: number, reqProbeTO: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetIdleTimeouts");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(reqLinkTO);
            msg.body_Write_U(reqProbeTO);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var actLinkTO: number = msg.body_Read_U();
                    var actProbeTO: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition, actLinkTO, actProbeTO);
                }
            );
        };

        public static method__SetLinkTimeout(connection: ConnectorBase, sessionId: number, inLinkTO: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetLinkTimeout");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(inLinkTO);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    var outLinkTO: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition, outLinkTO);
                }
            );
        };

        public static method__UnbindSessionPort(connection: ConnectorBase, port: number, cb): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("UnbindSessionPort");
            msg.hdr_SetSignature("q");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(port);
            connection.SendMsgWithCallback(msg,
                function () {
                    msg = msg.m_Reply;
                    msg.body_StartReading();
                    var disposition: number = msg.body_Read_U();
                    if (null != cb) cb(connection, disposition);
                }
            );
        };

        private static handle__FoundAdvertisedName(connection: ConnectorBase, name: string, transport: number, prefix: string): void {
        };

        private static handle__LostAdvertisedName(connection, name: string, transport: number, prefix: string): void {
        };

        private static handle__MPSessionChanged(connection: ConnectorBase, sessionId: number, name: string, isAdded: boolean): void {
        };

        private static handle__MPSessionChangedWithReason(connection: ConnectorBase, sessionId: number, name: string, isAdded: boolean, reason: number): void {
        };

        private static handle__SessionLost(connection: ConnectorBase, sessionId: number): void {
        };

        private static handle__SessionLostWithReason(connection: ConnectorBase, sessionId: number, reason: number): void {
        };

        private static handle__SessionLostWithReasonAndDisposition(connection: ConnectorBase, sessionId: number, reason: number, disposition: number): void {
        };
    };

    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Session - producer
    //==============================================================================================================

    class org_alljoyn_bus_peer_session {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "AcceptSession") {
                return this.__process__AcceptSession(connection, msg);
            }
            else if (member == "SessionJoined") {
                return this.__process__SessionJoined(connection, msg);
            }

            return false;
        }

        private static __process__AcceptSession(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var port: number = msg.body_Read_Q();
            var id: number = msg.body_Read_U();
            var src: string = msg.body_Read_S();
            var opts: any = msg.body_ReadObject("a{sv}");
            var ret: boolean = this.handle__AcceptSession(connection, port, id, src, opts);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("b");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_B(ret);

            return true;
        }

        private static __process__SessionJoined(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var port: number = msg.body_Read_Q();
            var id: number = msg.body_Read_U();
            var src: string = msg.body_Read_S();
            this.handle__SessionJoined(connection, port, id, src);

            return true;
        }

        private static handle__AcceptSession(connection: ConnectorBase, port: number, id: number, src: string, opts: any): boolean {
            return true;
        }

        private static handle__SessionJoined(connection: ConnectorBase, port: number, id: number, src: string): void {
        }
    };

    //==============================================================================================================
    // org.alljoyn.Daemon - producer
    //==============================================================================================================

    class org_alljoyn_daemon {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "ProbeAck") {
                return this.__process__ProbeAck(connection, msg);
            }
            else if (member == "ProbeReq") {
                return this.__process__ProbeReq(connection, msg);
            }

            return false;
        }

        private static __process__ProbeAck(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            this.handle__ProbeAck(connection);

            return true;
        }

        private static __process__ProbeReq(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            this.handle__ProbeReq(connection);

            return true;
        }

        public static signal__ProbeAck(connection): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeAck");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        }

        public static signal__ProbeReq(connection): void {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeReq");
            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        }

        private static handle__ProbeAck(connection): void {
        }

        private static handle__ProbeReq(connection): void {
        }
    }

    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Authentication - producer
    //==============================================================================================================
    class org_alljoyn_bus_peer_authentication {
        public static _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            var member: string = msg.hdr_GetMember();

            if (member == "AuthChallenge") {
                return this.__process__AuthChallenge(connection, msg);
            }
            else if (member == "ExchangeGroupKeys") {
                return this.__process__ExchangeGroupKeys(connection, msg);
            }
            else if (member == "ExchangeGuids") {
                return this.__process__ExchangeGuids(connection, msg);
            }
            else if (member == "ExchangeSuites") {
                return this.__process__ExchangeSuites(connection, msg);
            }
            else if (member == "GenSessionKey") {
                return this.__process__GenSessionKey(connection, msg);
            }
            else if (member == "KeyAuthentication") {
                return this.__process__KeyAuthentication(connection, msg);
            }
            else if (member == "KeyExchange") {
                return this.__process__KeyExchange(connection, msg);
            }
            else if (member == "SendManifest") {
                return this.__process__SendManifest(connection, msg);
            }
            else if (member == "SendMemberships") {
                return this.__process__SendMemberships(connection, msg);
            }

            return false;
        }

        private static __process__AuthChallenge(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var challenge: string = msg.body_Read_S();
            var ret: string = this.handle__AuthChallenge(connection, challenge);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static __process__ExchangeGroupKeys(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localKeyMatter: Uint8Array = msg.body_Read_AY();
            var ret: Uint8Array = this.handle__ExchangeGroupKeys(connection, localKeyMatter);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);

            return true;
        }

        private static __process__ExchangeGuids(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localGuid: string = msg.body_Read_S();
            var localVersion: number = msg.body_Read_U();
            var ret: string = this.handle__ExchangeGuids(connection, localGuid, localVersion);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static __process__ExchangeSuites(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localAuthList: Uint32Array = msg.body_Read_AU();
            var ret: Uint32Array = this.handle__ExchangeSuites(connection, localAuthList);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("au");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AU(ret);

            return true;
        }

        private static __process__GenSessionKey(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localGuid: string = msg.body_Read_S();
            var remoteGuid: string = msg.body_Read_S();
            var localNonce: string = msg.body_Read_S();
            var ret: string = this.handle__GenSessionKey(connection, localGuid, remoteGuid, localNonce);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);

            return true;
        }

        private static __process__KeyAuthentication(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localVerifier: any = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret: any = this.handle__KeyAuthentication(connection, localVerifier);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteVariant(ret); // XXX - fix this

            return true;
        }

        private static __process__KeyExchange(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var localAuthMask: number = msg.body_Read_U();
            var localPublicKey: any = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret: number = this.handle__KeyExchange(connection, localAuthMask, localPublicKey);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("u");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_U(ret);

            return true;
        }

        private static __process__SendManifest(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var manifest: any = msg.body_ReadObject("a(ssa(syy))");
            var ret: any = this.handle__SendManifest(connection, manifest);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(ssa(syy))");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteObject(ret); // XXX - fix this

            return true;
        }

        private static __process__SendMemberships(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {
            msg.body_StartReading();
            var sendCode: number = msg.body_Read_Y();
            var memberships: any = msg.body_ReadObject("a(yay)");
            var ret: number = this.handle__SendMemberships(connection, sendCode, memberships);

            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("y");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_Y(ret);

            return true;
        }

        private static handle__AuthChallenge(connection: ConnectorBase, challenge: string): string {
            return "default-string";
        }

        private static handle__ExchangeGroupKeys(connection: ConnectorBase, localKeyMatter: Uint8Array): Uint8Array {
            return null; //[1, 2, 3];
        }

        private static handle__ExchangeGuids(connection: ConnectorBase, localGuid: string, localVersion: number): string {
            return "default-string";
        }

        private static handle__ExchangeSuites(connection: ConnectorBase, localAuthList: Uint32Array): Uint32Array {
            return null; //[1, 2, 3];
        }

        private static handle__GenSessionKey(connection: ConnectorBase, localGuid: string, remoteGuid: string, localNonce: string): string {
            return "default-string";
        }

        private static handle__KeyAuthentication(connection: ConnectorBase, localVerifier: any): any {
            return 0;
        }

        private static handle__KeyExchange(connection: ConnectorBase, localAuthMask: number, localPublicKey: any): number {
            return 0;
        }

        private static handle__SendManifest(connection: ConnectorBase, manifest: any): any {
            return 0;
        }

        private static handle__SendMemberships(connection: ConnectorBase, sendCode: number, memberships: any): number {
            return 0;
        }
    }
}
