var AJ;
(function (AJ) {
    var ConnectorState;
    (function (ConnectorState) {
        ConnectorState[ConnectorState["StateDisconnected"] = 0] = "StateDisconnected";
        ConnectorState[ConnectorState["StateTransportConnecting"] = 1] = "StateTransportConnecting";
        ConnectorState[ConnectorState["StateAuthAnonumousSent"] = 2] = "StateAuthAnonumousSent";
        ConnectorState[ConnectorState["StateInformProtoVersionSent"] = 3] = "StateInformProtoVersionSent";
        ConnectorState[ConnectorState["StateBeginSent"] = 4] = "StateBeginSent";
        ConnectorState[ConnectorState["StateHelloSent"] = 5] = "StateHelloSent";
        ConnectorState[ConnectorState["StateConnected"] = 6] = "StateConnected";
    })(ConnectorState || (ConnectorState = {}));
    ;
    (function (ConnectorEventType) {
        ConnectorEventType[ConnectorEventType["ConnectorEventNone"] = 0] = "ConnectorEventNone";
        ConnectorEventType[ConnectorEventType["ConnectorEventConnected"] = 1] = "ConnectorEventConnected";
        ConnectorEventType[ConnectorEventType["ConnectorEventConnectionFailed"] = 2] = "ConnectorEventConnectionFailed";
        ConnectorEventType[ConnectorEventType["ConnectorEventProcessRequested"] = 3] = "ConnectorEventProcessRequested";
        ConnectorEventType[ConnectorEventType["ConnectorEventTextReceived"] = 4] = "ConnectorEventTextReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventTextSent"] = 5] = "ConnectorEventTextSent";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReceived"] = 6] = "ConnectorEventMsgReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgSent"] = 7] = "ConnectorEventMsgSent";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReplyReceived"] = 8] = "ConnectorEventMsgReplyReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReplySent"] = 9] = "ConnectorEventMsgReplySent";
    })(AJ.ConnectorEventType || (AJ.ConnectorEventType = {}));
    var ConnectorEventType = AJ.ConnectorEventType;
    ;
    var ConnectorBase = (function () {
        function ConnectorBase() {
            this.m_Buffer = null;
            this.m_LocalNodeId = "";
            this.m_AssignedBusName = "";
            this.m_PeerNodeId = "";
            this.m_EventHandler = null;
            this.m_CalledMethods = new Array();
            this.m_Application = null;
            this.m_AnnouncementListener = null;
        }
        ConnectorBase.prototype.ConnectAndAuthenticate = function () {
            this.m_State = ConnectorState.StateTransportConnecting;
            this.ConnectTransport();
        };
        ConnectorBase.prototype.Disconnect = function () {
            this.DisconnectTransport();
        };
        ConnectorBase.prototype.SetApplication = function (application) {
            this.m_Application = application;
        };
        ConnectorBase.prototype.GetApplication = function () {
            return this.m_Application;
        };
        ConnectorBase.prototype.GetLocalNodeId = function () {
            return this.m_LocalNodeId;
        };
        ConnectorBase.prototype.SetAnnouncementListener = function (listener) {
            this.m_AnnouncementListener = listener;
        };
        ConnectorBase.prototype.OnTransportConnected = function (ok) {
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
        };
        ConnectorBase.prototype.OnDataReceived = function (data) {
            if (null != this.m_Buffer) {
                var a = new Uint8Array(this.m_Buffer.length + data.length);
                var offset = this.m_Buffer.length;
                for (var i = 0; i < offset; i++)
                    a[i] = this.m_Buffer[i];
                for (var i = 0; i < data.length; i++)
                    a[i + offset] = data[i];
                this.m_Buffer = a;
            }
            else {
                this.m_Buffer = data;
            }
            this.Process();
        };
        ConnectorBase.prototype.Process = function () {
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
                var line = this.ReceiveLine();
                if (line.substr(0, 3) == "OK ") {
                    this.SendLine("INFORM_PROTO_VERSION 12\r\n");
                    this.m_State = ConnectorState.StateInformProtoVersionSent;
                }
            }
            else if (ConnectorState.StateInformProtoVersionSent == this.m_State) {
                var line = this.ReceiveLine();
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
                    var msg = new AJ.MsgGeneric(AJ.MsgType.Unknown);
                    var length = msg.FromBuffer(this.m_Buffer);
                    if (0 == length)
                        break;
                    this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgReceived, msg);
                    var t = msg.hdr_GetMsgType();
                    if ((AJ.MsgType.Signal == t) || (AJ.MsgType.MethodCall == t)) {
                        var iface = msg.hdr_GetInterface();
                        if (iface == "org.freedesktop.DBus.Peer")
                            org_freedesktop_dbus_peer._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Introspectable")
                            org_freedesktop_dbus_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.allseen.Introspectable")
                            org_allseen_introspectable._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.About")
                            org_alljoyn_about._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Icon")
                            org_alljoyn_icon._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus")
                            org_freedesktop_dbus._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus")
                            org_alljoyn_bus._ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Properties")
                            org_freedesktop_dbus_properties._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Daemon")
                            org_alljoyn_daemon._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Session")
                            org_alljoyn_bus_peer_session._ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Authentication")
                            org_alljoyn_bus_peer_authentication._ProcessMsg(this, msg);
                        else if (null != this.m_Application)
                            this.m_Application._ProcessMsg(this, msg);
                        if (msg.m_Reply != null)
                            this.SendMsg(msg.m_Reply);
                    }
                    else if (t == AJ.MsgType.MethodReturn) {
                        var i = 0;
                        var sent = null;
                        if (this.m_AssignedBusName == "") {
                            this.m_AssignedBusName = msg.hdr_GetSender();
                        }
                        while (i < this.m_CalledMethods.length) {
                            sent = this.m_CalledMethods[i];
                            if (sent.hdr_GetSerialNumber() == msg.hdr_GetReplySerial()) {
                                this.m_CalledMethods[i] = this.m_CalledMethods[this.m_CalledMethods.length - 1];
                                this.m_CalledMethods.pop();
                                break;
                            }
                        }
                        if ((null != sent) && (null != sent.m_ReplyCb)) {
                            sent.m_Reply = msg;
                            sent.m_ReplyCb();
                        }
                    }
                    else if (t == AJ.MsgType.Error) {
                        console.log("XXX - ERROR " + msg.hdr_GetErrorName());
                    }
                    // update buffer
                    if (length < this.m_Buffer.length) {
                        var old_buffer = this.m_Buffer;
                        this.m_Buffer = new Uint8Array(old_buffer.length - length);
                        for (var i = 0; i < old_buffer.length - length; i++)
                            this.m_Buffer[i] = old_buffer[length + i];
                    }
                    else {
                        this.m_Buffer = null;
                    }
                }
            }
        };
        ConnectorBase.prototype.SendHello = function () {
            var __this__ = this;
            org_freedesktop_dbus.method__Hello(this, function (connection, bus) {
                __this__.m_LocalNodeId = bus;
                __this__.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnected, null);
                __this__.m_State = ConnectorState.StateConnected;
                if (__this__.m_Application != null) {
                    __this__.BindSessionPort();
                }
                else {
                    __this__.AttachSession();
                }
                if (__this__.m_AnnouncementListener != null) {
                    org_freedesktop_dbus.method__AddMatch(__this__, "org.alljoyn.About", "Announce", null);
                }
            });
        };
        ConnectorBase.prototype.BindSessionPort = function () {
            var __this__ = this;
            org_alljoyn_bus.method__BindSessionPort(this, 2, 0, function (connection, disposition, portOut) {
                org_alljoyn_about.signal__Announce(connection, 1, 2, null, null);
            });
        };
        ConnectorBase.prototype.AttachSession = function () {
        };
        ConnectorBase.prototype.SendLine = function (buffer) {
            var a = new Uint8Array(buffer.length);
            for (var i = 0; i < buffer.length; i++)
                a[i] = buffer.charCodeAt(i);
            this.WriteData(a);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextSent, buffer);
        };
        ConnectorBase.prototype.ReceiveLine = function () {
            // XXX - this is not quite correct
            var line = String.fromCharCode.apply(null, this.m_Buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextReceived, line);
            // XXX - this is not correct either
            this.m_Buffer = null;
            return line;
        };
        ConnectorBase.prototype.SendMsg = function (msg) {
            var buffer = msg.GetBuffer();
            this.WriteData(buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgSent, msg);
        };
        ConnectorBase.prototype.SendMsgWithCallback = function (msg, cb) {
            msg.m_ReplyCb = cb;
            this.m_CalledMethods.push(msg);
            this.SendMsg(msg);
        };
        ConnectorBase.prototype.SetConnectorEvent = function (e) {
            this.m_EventHandler = e;
        };
        ConnectorBase.prototype.QueueConnectorEvent = function (e, d) {
            // XXX - no queue for timebeing
            this.NotifyConnectorEvent(e, d);
        };
        ConnectorBase.prototype.NotifyConnectorEvent = function (e, d) {
            if (null != this.m_EventHandler) {
                this.m_EventHandler(e, d);
            }
        };
        return ConnectorBase;
    }());
    AJ.ConnectorBase = ConnectorBase;
    ;
    //==============================================================================================================
    // org.alljoyn.About - producer
    //==============================================================================================================
    var org_alljoyn_about = (function () {
        function org_alljoyn_about() {
        }
        org_alljoyn_about._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_alljoyn_about.__process__GetAboutData = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var ret = this.handle__GetAboutData(connection, s1);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_about.__process__GetObjectDescription = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetObjectDescription(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(oas)");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_about.__process__Announce = function (connection, msg) {
            msg.body_StartReading();
            var q1 = msg.body_Read_Q();
            var q2 = msg.body_Read_Q();
            var o1 = msg.body_ReadObject("a(oas)");
            var o2 = msg.body_ReadObject("a{sv}");
            this.handle__Announce(connection, q1, q2, o1, o2);
            return true;
        };
        org_alljoyn_about.signal__Announce = function (connection, q1, q2, o1, o2) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            var application = connection.GetApplication();
            msg.hdr_SetSessionless(true);
            msg.hdr_SetObjectPath("/About");
            msg.hdr_SetInterface("org.alljoyn.About");
            msg.hdr_SetMember("Announce");
            msg.hdr_SetSignature("qqa(oas)a{sv}");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(q1);
            msg.body_Write_Q(q2);
            // at this time we will write array elements manually
            //msg.body_WriteObject("a(oas)", [
            msg.body_Write_AROAS([
                ["/About", ["org.alljoyn.About"]],
                ["/About/DeviceIcon", ["org.alljoyn.Icon"]],
                ["/TestInterface", ["org.allmake.TestInterface"]]]);
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
            msg.body_Write_V(new Array("en"), "as");
            msg.body_Write_R_Start();
            msg.body_Write_S("Description");
            msg.body_Write_V(application.GetDescription(), "s");
            msg.body_Write_R_Start();
            msg.body_Write_S("DefaultLanguage");
            msg.body_Write_V("en", "s");
            msg.body_Write_A_End(true);
            connection.SendMsg(msg);
        };
        org_alljoyn_about.handle__GetAboutData = function (connection, s1) {
            return 0;
        };
        org_alljoyn_about.handle__GetObjectDescription = function (connection) {
            return 0;
        };
        org_alljoyn_about.handle__Announce = function (connection, q1, q2, o1, o2) {
        };
        return org_alljoyn_about;
    }());
    //==============================================================================================================
    // org.alljoyn.Icon - producer
    //==============================================================================================================
    var org_alljoyn_icon = (function () {
        function org_alljoyn_icon() {
        }
        org_alljoyn_icon._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "GetUrl") {
                return this.__process__GetUrl(connection, msg);
            }
            else if (member == "GetContent") {
                return this.__process__GetContent(connection, msg);
            }
            return false;
        };
        org_alljoyn_icon.__process__GetUrl = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetUrl(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_icon.__process__GetContent = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetContent(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);
            return true;
        };
        org_alljoyn_icon.handle__GetUrl = function (connection) {
            return "";
        };
        org_alljoyn_icon.handle__GetContent = function (connection) {
            return connection.GetApplication().GetIcon();
        };
        return org_alljoyn_icon;
    }());
    //==============================================================================================================
    // org.freedesktop.DBus.Properties - producer
    //==============================================================================================================
    var org_freedesktop_dbus_properties = (function () {
        function org_freedesktop_dbus_properties() {
        }
        org_freedesktop_dbus_properties._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_freedesktop_dbus_properties.__process__Get = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var s2 = msg.body_Read_S();
            var ret = this.handle__Get(connection, s1, s2);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();
            if (typeof (ret) == "string") {
                msg.m_Reply.body_Write_V(ret, "s");
            }
            else if (typeof (ret) == "number") {
                // XXX - why q??
                msg.m_Reply.body_Write_V(ret, "q");
            }
            return true;
        };
        org_freedesktop_dbus_properties.__process__Set = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var s2 = msg.body_Read_S();
            var v1 = null; //msg.body_ReadVariant(); // XXX - fix this
            this.handle__Set(connection, s1, s2, v1);
            msg.CreateReply();
            msg.m_Reply.body_StartWriting();
            return true;
        };
        org_freedesktop_dbus_properties.__process__GetAll = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var ret = this.handle__GetAll(connection, s1);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a{sv}");
            msg.m_Reply.body_StartWriting();
            //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_freedesktop_dbus_properties.handle__Get = function (connection, s1, s2) {
            var application = connection.GetApplication();
            if (s1 == "org.alljoyn.Icon") {
                if (s2 == "Version") {
                    return application.GetIconVersion();
                }
                else if (s2 == "MimeType") {
                    return application.GetIconMimeType();
                }
            }
            return 0;
        };
        org_freedesktop_dbus_properties.handle__Set = function (connection, s1, s2, v1) {
        };
        org_freedesktop_dbus_properties.handle__GetAll = function (connection, s1) {
            return 0;
        };
        return org_freedesktop_dbus_properties;
    }());
    //==============================================================================================================
    // org.freedesktop.DBus.Introspectable - producer
    //==============================================================================================================
    var org_freedesktop_dbus_introspectable = (function () {
        function org_freedesktop_dbus_introspectable() {
        }
        org_freedesktop_dbus_introspectable._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "Introspect") {
                return this.__process__Introspect(connection, msg);
            }
            return false;
        };
        org_freedesktop_dbus_introspectable.__process__Introspect = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__Introspect(connection, msg.hdr_GetObjectPath());
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_freedesktop_dbus_introspectable.handle__Introspect = function (connection, op) {
            var ret = "";
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
        };
        return org_freedesktop_dbus_introspectable;
    }());
    //==============================================================================================================
    // org.allseen.Introspectable - producer
    //==============================================================================================================
    var org_allseen_introspectable = (function () {
        function org_allseen_introspectable() {
        }
        org_allseen_introspectable._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "GetDescriptionLanguages") {
                return this.__process__GetDescriptionLanguages(connection, msg);
            }
            else if (member == "IntrospectWithDescription") {
                return this.__process__IntrospectWithDescription(connection, msg);
            }
            return false;
        };
        org_allseen_introspectable.__process__GetDescriptionLanguages = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetDescriptionLanguages(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("as");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AS(ret);
            return true;
        };
        org_allseen_introspectable.__process__IntrospectWithDescription = function (connection, msg) {
            msg.body_StartReading();
            var languageTag = msg.body_ReadString();
            var ret = this.handle__IntrospectWithDescription(connection, msg.hdr_GetObjectPath(), languageTag);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_allseen_introspectable.handle__GetDescriptionLanguages = function (connection) {
            return ["en"];
        };
        org_allseen_introspectable.handle__IntrospectWithDescription = function (connection, op, languageTag) {
            // ignore language tag
            return org_freedesktop_dbus_introspectable.handle__Introspect(connection, op);
        };
        return org_allseen_introspectable;
    }());
    ;
    //==============================================================================================================
    // org.freedesktop.DBus.Peer - producer
    //==============================================================================================================
    var org_freedesktop_dbus_peer = (function () {
        function org_freedesktop_dbus_peer() {
        }
        org_freedesktop_dbus_peer._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "Ping") {
                return this.__process__Ping(connection, msg);
            }
            else if (member == "GetMachineId") {
                return this.__process__GetMachineId(connection, msg);
            }
            return false;
        };
        org_freedesktop_dbus_peer.__process__Ping = function (connection, msg) {
            msg.body_StartReading();
            this.handle__Ping(connection);
            msg.CreateReply();
            msg.m_Reply.body_StartWriting();
            return true;
        };
        org_freedesktop_dbus_peer.__process__GetMachineId = function (connection, msg) {
            msg.body_StartReading();
            var ret = this.handle__GetMachineId(connection);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_freedesktop_dbus_peer.handle__Ping = function (connection) {
        };
        org_freedesktop_dbus_peer.handle__GetMachineId = function (connection) {
            return "default-string";
        };
        return org_freedesktop_dbus_peer;
    }());
    //==============================================================================================================
    // org.freedesktop.DBus - consumer
    //==============================================================================================================
    var org_freedesktop_dbus = (function () {
        function org_freedesktop_dbus() {
        }
        org_freedesktop_dbus._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_freedesktop_dbus.__process__NameOwnerChanged = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            var s2 = msg.body_Read_S();
            var s3 = msg.body_Read_S();
            this.handle__NameOwnerChanged(connection, s1, s2, s3);
            return true;
        };
        org_freedesktop_dbus.__process__NameLost = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            this.handle__NameLost(connection, s1);
            return true;
        };
        org_freedesktop_dbus.__process__NameAcquired = function (connection, msg) {
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            this.handle__NameAcquired(connection, s1);
            return true;
        };
        org_freedesktop_dbus.method__RequestName = function (connection, s1, u1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RequestName");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_U(u1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var u2 = msg.body_Read_U();
                if (null != cb)
                    cb(connection, u2);
            });
        };
        ;
        org_freedesktop_dbus.method__ReleaseName = function (connection, s1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("ReleaseName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var u1 = msg.body_Read_U();
                if (null != cb)
                    cb(connection, u1);
            });
        };
        ;
        org_freedesktop_dbus.method__Hello = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("Hello");
            msg.SetFlags(6);
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var s1 = msg.body_Read_S();
                if (null != cb)
                    cb(connection, s1);
            });
        };
        ;
        org_freedesktop_dbus.method__NameHasOwner = function (connection, s1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameHasOwner");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var b1 = msg.body_Read_B();
                if (null != cb)
                    cb(connection, b1);
            });
        };
        ;
        org_freedesktop_dbus.method__AddMatch = function (connection, iface, member, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("AddMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S("type='signal',interface='" + iface + "',member='" + member + "'");
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                if (null != cb)
                    cb(connection);
            });
        };
        ;
        org_freedesktop_dbus.method__RemoveMatch = function (connection, s1, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("RemoveMatch");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                if (null != cb)
                    cb(connection);
            });
        };
        ;
        org_freedesktop_dbus.signal__NameOwnerChanged = function (connection, s1, s2, s3) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameOwnerChanged");
            msg.hdr_SetSignature("sss");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            msg.body_Write_S(s2);
            msg.body_Write_S(s3);
            connection.SendMsg(msg);
        };
        ;
        org_freedesktop_dbus.signal__NameLost = function (connection, s1) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameLost");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };
        ;
        org_freedesktop_dbus.signal__NameAcquired = function (connection, s1) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.freedesktop.DBus");
            msg.hdr_SetObjectPath("/org/freedesktop/DBus");
            msg.hdr_SetDestination("org.freedesktop.DBus");
            msg.hdr_SetMember("NameAcquired");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(s1);
            connection.SendMsg(msg);
        };
        ;
        org_freedesktop_dbus.handle__NameOwnerChanged = function (connection, s1, s2, s3) {
        };
        ;
        org_freedesktop_dbus.handle__NameLost = function (connection, s1) {
        };
        ;
        org_freedesktop_dbus.handle__NameAcquired = function (connection, s1) {
        };
        ;
        return org_freedesktop_dbus;
    }());
    ;
    //==============================================================================================================
    // org.alljoyn.Bus - consumer
    //==============================================================================================================
    var org_alljoyn_bus = (function () {
        function org_alljoyn_bus() {
        }
        org_alljoyn_bus._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_alljoyn_bus.__process__FoundAdvertisedName = function (connection, msg) {
            msg.body_StartReading();
            var name = msg.body_Read_S();
            var transport = msg.body_Read_Q();
            var prefix = msg.body_Read_S();
            this.handle__FoundAdvertisedName(connection, name, transport, prefix);
            return true;
        };
        org_alljoyn_bus.__process__LostAdvertisedName = function (connection, msg) {
            msg.body_StartReading();
            var name = msg.body_Read_S();
            var transport = msg.body_Read_Q();
            var prefix = msg.body_Read_S();
            this.handle__LostAdvertisedName(connection, name, transport, prefix);
            return true;
        };
        org_alljoyn_bus.__process__MPSessionChanged = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var name = msg.body_Read_S();
            var isAdded = msg.body_Read_B();
            this.handle__MPSessionChanged(connection, sessionId, name, isAdded);
            return true;
        };
        org_alljoyn_bus.__process__MPSessionChangedWithReason = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var name = msg.body_Read_S();
            var isAdded = msg.body_Read_B();
            var reason = msg.body_Read_U();
            this.handle__MPSessionChangedWithReason(connection, sessionId, name, isAdded, reason);
            return true;
        };
        org_alljoyn_bus.__process__SessionLost = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            this.handle__SessionLost(connection, sessionId);
            return true;
        };
        org_alljoyn_bus.__process__SessionLostWithReason = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var reason = msg.body_Read_U();
            this.handle__SessionLostWithReason(connection, sessionId, reason);
            return true;
        };
        org_alljoyn_bus.__process__SessionLostWithReasonAndDisposition = function (connection, msg) {
            msg.body_StartReading();
            var sessionId = msg.body_Read_U();
            var reason = msg.body_Read_U();
            var disposition = msg.body_Read_U();
            this.handle__SessionLostWithReasonAndDisposition(connection, sessionId, reason, disposition);
            return true;
        };
        org_alljoyn_bus.method__AdvertiseName = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__AliasUnixUser = function (connection, aliasUID, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("AliasUnixUser");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(aliasUID);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__BindSessionPort = function (connection, portIn, opts, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BindSessionPort");
            msg.hdr_SetSignature("qa{sv}");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(portIn);
            // XXX - just fixed options at the moment
            //msg.body_WriteObject(opts, "a{sv}");
            var ooo = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x66, 0x00, 0x01, 0x79, 0x00, 0x01, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x6D, 0x75, 0x6C, 0x74, 0x69, 0x00, 0x01, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x70, 0x72, 0x6F, 0x78, 0x00, 0x01, 0x79, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x6E, 0x73, 0x00, 0x01, 0x71, 0x00, 0x00, 0x05, 0x01]);
            msg.body_Write_I(0x48);
            msg.body_WriteRaw(ooo);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var portOut = msg.body_Read_Q();
                if (null != cb)
                    cb(connection, disposition, portOut);
            });
        };
        ;
        org_alljoyn_bus.method__BusHello = function (connection, GUIDC, protoVerC, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("BusHello");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(GUIDC);
            msg.body_Write_U(protoVerC);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var GUIDS = msg.body_Read_S();
                var uniqueName = msg.body_Read_S();
                var protoVerS = msg.body_Read_U();
                if (null != cb)
                    cb(connection, GUIDS, uniqueName, protoVerS);
            });
        };
        ;
        org_alljoyn_bus.method__CancelAdvertiseName = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelAdvertiseName");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelFindAdvertisedName = function (connection, name, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelFindAdvertisedNameByTransport = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelFindAdvertisementByTransport = function (connection, matching, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelFindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__CancelSessionlessMessage = function (connection, serialNum, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("CancelSessionlessMessage");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(serialNum);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__FindAdvertisedName = function (connection, name, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedName");
            msg.hdr_SetSignature("s");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__FindAdvertisedNameByTransport = function (connection, name, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisedNameByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__FindAdvertisementByTransport = function (connection, matching, transports, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FindAdvertisementByTransport");
            msg.hdr_SetSignature("sq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(matching);
            msg.body_Write_Q(transports);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.signal__FoundAdvertisedName = function (connection, name, transport, prefix) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("FoundAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.method__GetHostInfo = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("GetHostInfo");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var localipaddr = msg.body_Read_S();
                var remoteipaddr = msg.body_Read_S();
                if (null != cb)
                    cb(connection, disposition, localipaddr, remoteipaddr);
            });
        };
        ;
        org_alljoyn_bus.method__JoinSession = function (connection, sessionHost, port, opts, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("JoinSession");
            msg.hdr_SetSignature("sqa{sv}");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(sessionHost);
            msg.body_Write_Q(port);
            msg.body_WriteObject("a{sv}", opts);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disp = msg.body_Read_U();
                var sessionId = msg.body_Read_U();
                var opts = msg.body_ReadObject("a{sv}");
                if (null != cb)
                    cb(connection, disp, sessionId, opts);
            });
        };
        ;
        org_alljoyn_bus.method__LeaveHostedSession = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveHostedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__LeaveJoinedSession = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveJoinedSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__LeaveSession = function (connection, sessionId, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LeaveSession");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.signal__LostAdvertisedName = function (connection, name, transport, prefix) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("LostAdvertisedName");
            msg.hdr_SetSignature("sqs");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_Q(transport);
            msg.body_Write_S(prefix);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__MPSessionChanged = function (connection, sessionId, name, isAdded) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChanged");
            msg.hdr_SetSignature("usb");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__MPSessionChangedWithReason = function (connection, sessionId, name, isAdded, reason) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("MPSessionChangedWithReason");
            msg.hdr_SetSignature("usbu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            msg.body_Write_B(isAdded);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.method__OnAppResume = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppResume");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__OnAppSuspend = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("OnAppSuspend");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__Ping = function (connection, name, timeout, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("Ping");
            msg.hdr_SetSignature("su");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_S(name);
            msg.body_Write_U(timeout);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.method__ReloadConfig = function (connection, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("ReloadConfig");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var loaded = msg.body_Read_B();
                if (null != cb)
                    cb(connection, loaded);
            });
        };
        ;
        org_alljoyn_bus.method__RemoveSessionMember = function (connection, sessionId, name, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("RemoveSessionMember");
            msg.hdr_SetSignature("us");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_S(name);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.signal__SessionLost = function (connection, sessionId) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLost");
            msg.hdr_SetSignature("u");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__SessionLostWithReason = function (connection, sessionId, reason) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReason");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.signal__SessionLostWithReasonAndDisposition = function (connection, sessionId, reason, disposition) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SessionLostWithReasonAndDisposition");
            msg.hdr_SetSignature("uuu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(reason);
            msg.body_Write_U(disposition);
            connection.SendMsg(msg);
        };
        ;
        org_alljoyn_bus.method__SetIdleTimeouts = function (connection, reqLinkTO, reqProbeTO, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetIdleTimeouts");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(reqLinkTO);
            msg.body_Write_U(reqProbeTO);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var actLinkTO = msg.body_Read_U();
                var actProbeTO = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition, actLinkTO, actProbeTO);
            });
        };
        ;
        org_alljoyn_bus.method__SetLinkTimeout = function (connection, sessionId, inLinkTO, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("SetLinkTimeout");
            msg.hdr_SetSignature("uu");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_U(sessionId);
            msg.body_Write_U(inLinkTO);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                var outLinkTO = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition, outLinkTO);
            });
        };
        ;
        org_alljoyn_bus.method__UnbindSessionPort = function (connection, port, cb) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
            msg.hdr_SetInterface("org.alljoyn.Bus");
            msg.hdr_SetObjectPath("/org/alljoyn/Bus");
            msg.hdr_SetDestination("org.alljoyn.Bus");
            msg.hdr_SetMember("UnbindSessionPort");
            msg.hdr_SetSignature("q");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            msg.body_Write_Q(port);
            connection.SendMsgWithCallback(msg, function () {
                msg = msg.m_Reply;
                msg.body_StartReading();
                var disposition = msg.body_Read_U();
                if (null != cb)
                    cb(connection, disposition);
            });
        };
        ;
        org_alljoyn_bus.handle__FoundAdvertisedName = function (connection, name, transport, prefix) {
        };
        ;
        org_alljoyn_bus.handle__LostAdvertisedName = function (connection, name, transport, prefix) {
        };
        ;
        org_alljoyn_bus.handle__MPSessionChanged = function (connection, sessionId, name, isAdded) {
        };
        ;
        org_alljoyn_bus.handle__MPSessionChangedWithReason = function (connection, sessionId, name, isAdded, reason) {
        };
        ;
        org_alljoyn_bus.handle__SessionLost = function (connection, sessionId) {
        };
        ;
        org_alljoyn_bus.handle__SessionLostWithReason = function (connection, sessionId, reason) {
        };
        ;
        org_alljoyn_bus.handle__SessionLostWithReasonAndDisposition = function (connection, sessionId, reason, disposition) {
        };
        ;
        return org_alljoyn_bus;
    }());
    ;
    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Session - producer
    //==============================================================================================================
    var org_alljoyn_bus_peer_session = (function () {
        function org_alljoyn_bus_peer_session() {
        }
        org_alljoyn_bus_peer_session._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "AcceptSession") {
                return this.__process__AcceptSession(connection, msg);
            }
            else if (member == "SessionJoined") {
                return this.__process__SessionJoined(connection, msg);
            }
            return false;
        };
        org_alljoyn_bus_peer_session.__process__AcceptSession = function (connection, msg) {
            msg.body_StartReading();
            var port = msg.body_Read_Q();
            var id = msg.body_Read_U();
            var src = msg.body_Read_S();
            var opts = msg.body_ReadObject("a{sv}");
            var ret = this.handle__AcceptSession(connection, port, id, src, opts);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("b");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_B(ret);
            return true;
        };
        org_alljoyn_bus_peer_session.__process__SessionJoined = function (connection, msg) {
            msg.body_StartReading();
            var port = msg.body_Read_Q();
            var id = msg.body_Read_U();
            var src = msg.body_Read_S();
            this.handle__SessionJoined(connection, port, id, src);
            return true;
        };
        org_alljoyn_bus_peer_session.handle__AcceptSession = function (connection, port, id, src, opts) {
            return true;
        };
        org_alljoyn_bus_peer_session.handle__SessionJoined = function (connection, port, id, src) {
        };
        return org_alljoyn_bus_peer_session;
    }());
    ;
    //==============================================================================================================
    // org.alljoyn.Daemon - producer
    //==============================================================================================================
    var org_alljoyn_daemon = (function () {
        function org_alljoyn_daemon() {
        }
        org_alljoyn_daemon._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
            if (member == "ProbeAck") {
                return this.__process__ProbeAck(connection, msg);
            }
            else if (member == "ProbeReq") {
                return this.__process__ProbeReq(connection, msg);
            }
            return false;
        };
        org_alljoyn_daemon.__process__ProbeAck = function (connection, msg) {
            msg.body_StartReading();
            this.handle__ProbeAck(connection);
            return true;
        };
        org_alljoyn_daemon.__process__ProbeReq = function (connection, msg) {
            msg.body_StartReading();
            this.handle__ProbeReq(connection);
            return true;
        };
        org_alljoyn_daemon.signal__ProbeAck = function (connection) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeAck");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        };
        org_alljoyn_daemon.signal__ProbeReq = function (connection) {
            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
            msg.hdr_SetInterface("org.alljoyn.Daemon");
            msg.hdr_SetObjectPath("x");
            msg.hdr_SetMember("ProbeReq");
            if (null != connection.GetLocalNodeId())
                msg.hdr_SetSender(connection.GetLocalNodeId());
            msg.body_StartWriting();
            connection.SendMsg(msg);
        };
        org_alljoyn_daemon.handle__ProbeAck = function (connection) {
        };
        org_alljoyn_daemon.handle__ProbeReq = function (connection) {
        };
        return org_alljoyn_daemon;
    }());
    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Authentication - producer
    //==============================================================================================================
    var org_alljoyn_bus_peer_authentication = (function () {
        function org_alljoyn_bus_peer_authentication() {
        }
        org_alljoyn_bus_peer_authentication._ProcessMsg = function (connection, msg) {
            var member = msg.hdr_GetMember();
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
        };
        org_alljoyn_bus_peer_authentication.__process__AuthChallenge = function (connection, msg) {
            msg.body_StartReading();
            var challenge = msg.body_Read_S();
            var ret = this.handle__AuthChallenge(connection, challenge);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__ExchangeGroupKeys = function (connection, msg) {
            msg.body_StartReading();
            var localKeyMatter = msg.body_Read_AY();
            var ret = this.handle__ExchangeGroupKeys(connection, localKeyMatter);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("ay");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AY(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__ExchangeGuids = function (connection, msg) {
            msg.body_StartReading();
            var localGuid = msg.body_Read_S();
            var localVersion = msg.body_Read_U();
            var ret = this.handle__ExchangeGuids(connection, localGuid, localVersion);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__ExchangeSuites = function (connection, msg) {
            msg.body_StartReading();
            var localAuthList = msg.body_Read_AU();
            var ret = this.handle__ExchangeSuites(connection, localAuthList);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("au");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_AU(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__GenSessionKey = function (connection, msg) {
            msg.body_StartReading();
            var localGuid = msg.body_Read_S();
            var remoteGuid = msg.body_Read_S();
            var localNonce = msg.body_Read_S();
            var ret = this.handle__GenSessionKey(connection, localGuid, remoteGuid, localNonce);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("s");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_S(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__KeyAuthentication = function (connection, msg) {
            msg.body_StartReading();
            var localVerifier = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret = this.handle__KeyAuthentication(connection, localVerifier);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("v");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteVariant(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__KeyExchange = function (connection, msg) {
            msg.body_StartReading();
            var localAuthMask = msg.body_Read_U();
            var localPublicKey = null; // msg.body_ReadVariant(); // XXX - fix this
            var ret = this.handle__KeyExchange(connection, localAuthMask, localPublicKey);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("u");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_U(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__SendManifest = function (connection, msg) {
            msg.body_StartReading();
            var manifest = msg.body_ReadObject("a(ssa(syy))");
            var ret = this.handle__SendManifest(connection, manifest);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("a(ssa(syy))");
            msg.m_Reply.body_StartWriting();
            // msg.m_Reply.body_WriteObject(ret); // XXX - fix this
            return true;
        };
        org_alljoyn_bus_peer_authentication.__process__SendMemberships = function (connection, msg) {
            msg.body_StartReading();
            var sendCode = msg.body_Read_Y();
            var memberships = msg.body_ReadObject("a(yay)");
            var ret = this.handle__SendMemberships(connection, sendCode, memberships);
            msg.CreateReply();
            msg.m_Reply.hdr_SetSignature("y");
            msg.m_Reply.body_StartWriting();
            msg.m_Reply.body_Write_Y(ret);
            return true;
        };
        org_alljoyn_bus_peer_authentication.handle__AuthChallenge = function (connection, challenge) {
            return "default-string";
        };
        org_alljoyn_bus_peer_authentication.handle__ExchangeGroupKeys = function (connection, localKeyMatter) {
            return null; //[1, 2, 3];
        };
        org_alljoyn_bus_peer_authentication.handle__ExchangeGuids = function (connection, localGuid, localVersion) {
            return "default-string";
        };
        org_alljoyn_bus_peer_authentication.handle__ExchangeSuites = function (connection, localAuthList) {
            return null; //[1, 2, 3];
        };
        org_alljoyn_bus_peer_authentication.handle__GenSessionKey = function (connection, localGuid, remoteGuid, localNonce) {
            return "default-string";
        };
        org_alljoyn_bus_peer_authentication.handle__KeyAuthentication = function (connection, localVerifier) {
            return 0;
        };
        org_alljoyn_bus_peer_authentication.handle__KeyExchange = function (connection, localAuthMask, localPublicKey) {
            return 0;
        };
        org_alljoyn_bus_peer_authentication.handle__SendManifest = function (connection, manifest) {
            return 0;
        };
        org_alljoyn_bus_peer_authentication.handle__SendMemberships = function (connection, sendCode, memberships) {
            return 0;
        };
        return org_alljoyn_bus_peer_authentication;
    }());
})(AJ || (AJ = {}));
//# sourceMappingURL=alljoyn-connector-base.js.map