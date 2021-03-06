var editor = null;
var editorScript = null;
var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["CONNECTION_LOOPBACK"] = 0] = "CONNECTION_LOOPBACK";
    ConnectionType[ConnectionType["CONNECTION_DISCOVER"] = 1] = "CONNECTION_DISCOVER";
    ConnectionType[ConnectionType["CONNECTION_WEBSOCKET"] = 2] = "CONNECTION_WEBSOCKET";
    ConnectionType[ConnectionType["CONNECTION_AZURE"] = 3] = "CONNECTION_AZURE";
})(ConnectionType || (ConnectionType = {}));
;
var ExploreDeviceInterface = (function () {
    function ExploreDeviceInterface() {
    }
    return ExploreDeviceInterface;
}());
var ExploreDeviceData = (function () {
    function ExploreDeviceData() {
        this.m_DeviceName = "";
        // XXX - other device details
        this.m_Interfaces = [];
    }
    return ExploreDeviceData;
}());
var AllJoynTsApp = (function () {
    function AllJoynTsApp() {
        //----------------------------------------------------------------------------------------------------------
        // MEMBERS
        //----------------------------------------------------------------------------------------------------------
        // HTML fragments
        this.m_HtmlFront = "";
        this.m_HtmlBootstrap = "";
        this.m_HtmlCreate = "";
        this.m_HtmlExplore = "";
        this.m_HtmlSamples = "";
        this.m_HtmlSetup = "";
        this.m_HtmlHelp = "";
        // create view variables
        this.m_CreateConnector = null;
        this.m_CreateIntrospectionXml = "";
        this.m_CreateEditingTs = false;
        this.m_CreateCodeTs = "";
        this.m_CreateCodeJs = "";
        this.m_CreateApplicationId = Generator.DEFAULT_APP_ID;
        this.m_CreateApplicationName = Generator.DEFAULT_APP_NAME;
        this.m_CreateDeviceId = Generator.DEFAULT_DEVICE_ID;
        this.m_CreateDeviceName = Generator.DEFAULT_DEVICE_NAME;
        this.m_CreateManufacturer = Generator.DEFAULT_MANUFACTURER;
        this.m_CreateModelNumber = Generator.DEFAULT_MODEL_NUMBER;
        this.m_CreateLocked = false;
        this.m_TsMsg = "";
        this.m_TsConnectorBase = "";
        this.m_TsConnectorWebSocket = "";
        this.m_TsApplicationBase = "";
        // explore variables
        this.m_ExploreConnector = null;
        this.m_ExploreDeviceData = [];
        this.m_ExploreCurrentDevice = null;
        // setup variables
        this.m_ConnectionType = ConnectionType.CONNECTION_WEBSOCKET;
        this.m_ConnectionAzureParam = "<azure connection string>";
        this.m_ConnectionWebsocketParam = "ws://127.0.0.1:8088";
        this.m_CreateIntrospectionXml = Generator.DEFAULT_APP_INTROSPECTION_XML.replace(/></g, ">\r\n<");
        //(window as any).editor.setValue(this.introspectionXml);
        this.RetrieveTemplate("front.html", "m_HtmlFront");
        this.RetrieveTemplate("bootstrap.html", "m_HtmlBootstrap");
        this.RetrieveTemplate("create.html", "m_HtmlCreate");
        this.RetrieveTemplate("explore.html", "m_HtmlExplore");
        this.RetrieveTemplate("samples.html", "m_HtmlSamples");
        this.RetrieveTemplate("setup.html", "m_HtmlSetup");
        this.RetrieveTemplate("help.html", "m_HtmlHelp");
        this.RetrieveTemplate("alljoyn/alljoyn-msg.ts", "m_TsMsg");
        this.RetrieveTemplate("alljoyn/alljoyn-connector-base.ts", "m_TsConnectorBase");
        this.RetrieveTemplate("alljoyn/alljoyn-connector-websocket.ts", "m_TsConnectorWebSocket");
        this.RetrieveTemplate("alljoyn/alljoyn-application-base.ts", "m_TsApplicationBase");
    }
    AllJoynTsApp.prototype.start = function () {
    };
    AllJoynTsApp.prototype.stop = function () {
    };
    //----------------------------------------------------------------------------------------------------------
    // MAIN MENU HANDLING
    //----------------------------------------------------------------------------------------------------------
    AllJoynTsApp.prototype.GoToFrontPage = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.m_HtmlFront;
        this.MenuHighlight("");
    };
    AllJoynTsApp.prototype.GoToBootstrap = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.m_HtmlBootstrap;
        this.MenuHighlight("menu-bootstrap");
    };
    AllJoynTsApp.prototype.GoToCreate = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.m_HtmlCreate;
        window.editor = window.CodeMirror.fromTextArea(window.document.getElementById("introspectionXml"), {
            lineNumbers: true, mode: "text/xml", theme: "ttcn"
        });
        var __this__ = this;
        window.editor.on("change", function (instance, changeObj) {
            console.log("INTROSPECTION XML CHANGED");
            __this__.onDeviceInfoChanged();
        });
        window.editorScript = window.CodeMirror.fromTextArea(window.document.getElementById("generatedCode"), {
            lineNumbers: true, mode: "text/typescript", theme: "ttcn"
        });
        var __this__ = this;
        window.editorScript.on("change", function (instance, changeObj) {
            if (__this__.m_CreateEditingTs) {
                console.log("TS SCRIPT CHANGED");
                __this__.m_CreateCodeJs = "";
                __this__.m_CreateCodeTs = window.editorScript.getValue();
            }
        });
        this.m_CreateLocked = true;
        window.editor.setValue(this.m_CreateIntrospectionXml);
        //(window.document.getElementById("create-application-id") as HTMLInputElement).value = this.m_ApplicationId;
        window.document.getElementById("create-application-name").value = this.m_CreateApplicationName;
        window.document.getElementById("create-device-id").value = this.m_CreateDeviceId;
        window.document.getElementById("create-device-name").value = this.m_CreateDeviceName;
        window.document.getElementById("create-manufacturer").value = this.m_CreateManufacturer;
        window.document.getElementById("create-model-number").value = this.m_CreateModelNumber;
        this.m_CreateLocked = false;
        this.MenuHighlight("menu-create");
    };
    AllJoynTsApp.prototype.GoToExplore = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.m_HtmlExplore;
        this.MenuHighlight("menu-explore");
    };
    AllJoynTsApp.prototype.GoToSamples = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.m_HtmlSamples;
        this.MenuHighlight("menu-samples");
    };
    AllJoynTsApp.prototype.GoToSetup = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.m_HtmlSetup;
        switch (this.m_ConnectionType) {
            case ConnectionType.CONNECTION_LOOPBACK:
                window.document.getElementById("connection-loopback").checked = true;
                break;
            case ConnectionType.CONNECTION_DISCOVER:
                window.document.getElementById("connection-discover").checked = true;
                break;
            case ConnectionType.CONNECTION_WEBSOCKET:
                window.document.getElementById("connection-websocket").checked = true;
                break;
            case ConnectionType.CONNECTION_AZURE:
                window.document.getElementById("connection-azure").checked = true;
                break;
        }
        window.document.getElementById("connection-azure-text").value = this.m_ConnectionAzureParam;
        window.document.getElementById("connection-websocket-text").value = this.m_ConnectionWebsocketParam;
        this.MenuHighlight("menu-setup");
    };
    AllJoynTsApp.prototype.GoToHelp = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.m_HtmlHelp;
        this.MenuHighlight("menu-help");
    };
    AllJoynTsApp.prototype.MenuHighlight = function (id) {
        var menu = window.document.getElementById("menu");
        var child = menu.firstElementChild;
        while (null != child) {
            var childId = child.id;
            if (childId.substring(0, 5) == "menu-") {
                if (childId == id) {
                    child.className = "hvr-underline-reveal-selected";
                }
                else {
                    child.className = "hvr-underline-reveal";
                }
            }
            child = child.nextElementSibling;
        }
    };
    //----------------------------------------------------------------------------------------------------------
    // CREATE VIEW
    //----------------------------------------------------------------------------------------------------------
    AllJoynTsApp.prototype.onConnectorEvent = function (e, d) {
        var el = window.document.getElementById("content");
        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("log-create", "<br/>ALLJOYN CONNECTED");
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventConnectionFailed) {
            this.AppendLog("log-create", "<br/>ALLJOYN CONNECTION FAILED");
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventTextSent) {
            this.AppendLog("log-create", "<br/>AUTH >> " + d);
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventTextReceived) {
            this.AppendLog("log-create", "<br/>AUTH << " + d);
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventMsgSent) {
            this.AppendLog("log-create", "<br/>DBUS >> " + d.hdr_GetMsgType() + " " + d.hdr_GetMember());
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventMsgReceived) {
            this.AppendLog("log-create", "<br/>DBUS << " + d.hdr_GetMsgType() + " " + d.hdr_GetMember());
        }
    };
    AllJoynTsApp.prototype.updateXml = function () {
    };
    AllJoynTsApp.prototype.updateTs = function () {
        var xml = window.editor.getValue();
        //(window.document.getElementById("introspectionXml") as HTMLTextAreaElement).textContent;
        if (this.m_CreateCodeTs == "") {
            var p = new Generator.IntrospectionXmlParser();
            // first, parse introspection xml
            try {
                p.ParseXml(xml);
            }
            catch (e) {
                this.AppendLog("log-create", "<br/>" + e);
            }
            this.AppendLog("log-create", "<br/>PARSER FINISHED: " + p.m_ObjectPath + " " + p.m_Interface);
            // create code generator
            var gen = new Generator.CodeGeneratorTS(p.m_Methods);
            gen.SetIntrospectionXml(xml);
            gen.SetIconData(Generator.DEFAULT_DEVICE_ICON_MIME_TYPE, Generator.DEFAULT_DEVICE_ICON_URL, Generator.DEFAULT_DEVICE_ICON);
            gen.SetDeviceData(this.m_CreateApplicationId, this.m_CreateApplicationName, this.m_CreateDeviceId, this.m_CreateDeviceName, this.m_CreateManufacturer, this.m_CreateModelNumber, p.m_ObjectPath, p.m_Interface);
            this.m_CreateCodeTs = this.m_TsMsg + this.m_TsConnectorBase + this.m_TsConnectorWebSocket + this.m_TsApplicationBase;
            // XXX - add readers & writers
            //this.m_CreateCodeTs = this.m_CreateCodeTs.replace("/*WRITER-CODE-HERE*/", gen.GenerateWriters());
            //this.m_CreateCodeTs = this.m_CreateCodeTs.replace("/*READER-CODE-HERE*/", gen.GenerateReaders());
            this.m_CreateCodeTs += gen.GenerateApplicationCode();
            this.m_CreateCodeJs = "";
        }
    };
    AllJoynTsApp.prototype.updateJs = function () {
        if (this.m_CreateCodeJs == "") {
            this.updateTs();
            this.m_CreateCodeJs = ConvertTsToJs(this.m_CreateCodeTs);
        }
    };
    AllJoynTsApp.prototype.onShowTs = function () {
        this.updateTs();
        window.editorScript.setValue(this.m_CreateCodeTs);
        this.m_CreateEditingTs = true;
    };
    AllJoynTsApp.prototype.onShowJs = function () {
        this.m_CreateEditingTs = false;
        this.updateJs();
        window.editorScript.setValue(this.m_CreateCodeJs);
    };
    AllJoynTsApp.prototype.onTest = function () {
        this.onShowJs();
        var geval = eval;
        geval(this.m_CreateCodeJs);
        // try to restart with new service
        if (null != this.m_CreateConnector) {
            this.m_CreateConnector.Disconnect();
        }
        this.m_CreateConnector = null;
        this.m_CreateConnector = new AJ.ConnectorWebSocket();
        var self = this;
        this.m_CreateConnector.SetConnectorEvent(function (e, d) {
            self.onConnectorEvent(e, d);
        });
        this.m_CreateConnector.SetApplication(new AJ.Application());
        this.m_CreateConnector.ConnectAndAuthenticate();
    };
    AllJoynTsApp.prototype.onDeviceInfoChanged = function () {
        this.m_CreateCodeJs = "";
        this.m_CreateCodeTs = "";
        if (!this.m_CreateLocked) {
            // XXX - fix this
            //this.m_ApplicationId = (window.document.getElementById("create-application-id") as HTMLInputElement).value;
            this.m_CreateApplicationName = window.document.getElementById("create-application-name").value;
            this.m_CreateDeviceId = window.document.getElementById("create-device-id").value;
            this.m_CreateDeviceName = window.document.getElementById("create-device-name").value;
            this.m_CreateManufacturer = window.document.getElementById("create-manufacturer").value;
            this.m_CreateModelNumber = window.document.getElementById("create-model-number").value;
        }
    };
    //----------------------------------------------------------------------------------------------------------
    // EXPLORE VIEW
    //----------------------------------------------------------------------------------------------------------
    AllJoynTsApp.prototype.onExploreConnect = function () {
        this.AppendLog("log-explore", "<br/>CONNECTING....");
        // try to restart with new service
        if (null != this.m_ExploreConnector) {
            this.m_ExploreConnector.Disconnect();
        }
        this.m_ExploreConnector = new AJ.ConnectorWebSocket();
        var self = this;
        this.m_ExploreConnector.SetConnectorEvent(function (e, d) {
            self.onExploreConnectorEvent(e, d);
        });
        this.m_ExploreConnector.SetAnnouncementListener(function (sender, q1, q2, o1, o2) {
            self.onExploreAnnouncement(sender, q1, q2, o1, o2);
        });
        this.m_ExploreConnector.ConnectAndAuthenticate();
    };
    AllJoynTsApp.prototype.onExploreAnnouncement = function (sender, q1, q2, o1, o2) {
        var self = this;
        this.AppendLog("log-explore", "<br/>ANNOUNCEMENT RECEIVED FROM: " + sender);
        var device = new ExploreDeviceData();
        device.m_NodeId = sender;
        device.m_DeviceName = sender; // XXX - for timebeing
        for (var _i = 0, o1_1 = o1; _i < o1_1.length; _i++) {
            var o = o1_1[_i];
            var iface = new ExploreDeviceInterface();
            this.AppendLog("log-explore", "<br/>" + o[0] + " - " + o[1][0]);
            iface.m_ObjectPath = o[0];
            iface.m_Interface = o[0][1];
            iface.m_IntrospectionXml = "";
            AJ.org_freedesktop_dbus_introspectable.method__Introspect(self.m_ExploreConnector, sender, o[0], function (connection, xml) {
                self.AppendLog("log-explore", "<br/>XML RECEIVED");
                iface.m_IntrospectionXml = xml;
                self.ExploreUpdateView();
            });
            device.m_Interfaces.push(iface);
        }
        this.m_ExploreDeviceData.push(device);
        this.ExploreUpdateView();
        return;
    };
    AllJoynTsApp.prototype.onExploreConnectorEvent = function (e, d) {
        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("log-explore", "<br/>ALLJOYN CONNECTED");
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventConnectionFailed) {
            this.AppendLog("log-explore", "<br/>ALLJOYN CONNECTION FAILED");
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventTextSent) {
            this.AppendLog("log-explore", "<br/>AUTH >> " + d);
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventTextReceived) {
            this.AppendLog("log-explore", "<br/>AUTH << " + d);
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventMsgSent) {
            this.AppendLog("log-explore", "<br/>Message Sent: " + d.hdr_GetMsgType() + " " + d.hdr_GetMember());
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventMsgReceived) {
            this.AppendLog("log-explore", "<br/>Message Received: " + d.hdr_GetMsgType() + " " + d.hdr_GetMember());
        }
    };
    AllJoynTsApp.prototype.onMethodSignalCall = function (iface, ms) {
        this.AppendLog("log-explore", "<br/>CALLING METHOD/SIGNAL: " + iface + " " + ms);
        // create code generator
        var gen = new Generator.CodeGeneratorHTML(null);
        var data = gen.CreateDataFromFields(window.document, iface, "ss");
        this.AppendLog("log-explore", "<br/>DATA: " + data[0] + " " + data[1]);
    };
    AllJoynTsApp.prototype.onExploreDeviceSelected = function (nodeId) {
        this.AppendLog("log-explore", "<br/> DEVICE SELECTED " + nodeId);
        for (var _i = 0, _a = this.m_ExploreDeviceData; _i < _a.length; _i++) {
            var d = _a[_i];
            if (d.m_NodeId == nodeId) {
                this.AppendLog("log-explore", "<br/>FOUND");
                this.m_ExploreCurrentDevice = d;
                this.ExploreUpdateView();
                break;
            }
        }
    };
    AllJoynTsApp.prototype.ExploreUpdateView = function () {
        this.AppendLog("log-explore", "<br/>UPDATING VIEW");
        if (this.m_ExploreCurrentDevice == null) {
            this.ExploreUpdateDeviceList();
        }
        else {
            this.ExploreUpdateDevice();
        }
    };
    AllJoynTsApp.prototype.ExploreUpdateDeviceList = function () {
        var parent = window.document.getElementById("explore-form");
        parent.innerHTML = "";
        this.AppendLog("log-explore", "<br/>UPDATING DEVICE LIST");
        for (var _i = 0, _a = this.m_ExploreDeviceData; _i < _a.length; _i++) {
            var d = _a[_i];
            var name = d.m_DeviceName;
            var div = window.document.createElement("div");
            var btn = window.document.createElement("button");
            btn.style.width = "100px";
            btn.style.height = "100px";
            btn.setAttribute("onclick", "app.onExploreDeviceSelected('" + d.m_NodeId + "');");
            parent.appendChild(btn);
            btn.appendChild(div);
            div.innerHTML = name;
        }
    };
    AllJoynTsApp.prototype.ExploreUpdateDevice = function () {
        var parent = window.document.getElementById("explore-form");
        parent.innerHTML = "";
        this.AppendLog("log-explore", "<br/>UPDATING INTERFACES");
        for (var _i = 0, _a = this.m_ExploreCurrentDevice.m_Interfaces; _i < _a.length; _i++) {
            var i = _a[_i];
            this.AppendLog("log-explore", "<br/>UPDATING INTERFACE");
            if (i.m_IntrospectionXml != "") {
                this.AppendLog("log-explore", "<br/>INTROSPECTION IN PLACE");
                var p = new Generator.IntrospectionXmlParser();
                // first, parse introspection xml
                try {
                    p.ParseXml(i.m_IntrospectionXml);
                }
                catch (e) {
                    this.AppendLog("log-explore", "<br/>" + e);
                }
                this.AppendLog("log-explore", "<br/>PARSER FINISHED: " + p.m_ObjectPath + " " + p.m_Interface);
                // create code generator
                var gen = new Generator.CodeGeneratorHTML(p.m_Methods);
                gen.GenerateForm(parent, window.document);
            }
        }
    };
    //----------------------------------------------------------------------------------------------------------
    // SETUP VIEW
    //----------------------------------------------------------------------------------------------------------
    AllJoynTsApp.prototype.OnLoopbackSelected = function () {
        this.m_ConnectionType = ConnectionType.CONNECTION_LOOPBACK;
    };
    AllJoynTsApp.prototype.OnDiscoverSelected = function () {
        this.m_ConnectionType = ConnectionType.CONNECTION_DISCOVER;
    };
    AllJoynTsApp.prototype.OnWebsocketSelected = function () {
        this.m_ConnectionType = ConnectionType.CONNECTION_WEBSOCKET;
    };
    AllJoynTsApp.prototype.OnAzureSelected = function () {
        this.m_ConnectionType = ConnectionType.CONNECTION_AZURE;
    };
    AllJoynTsApp.prototype.OnWebsocketChanged = function () {
        this.m_ConnectionWebsocketParam = window.document.getElementById("connection-websocket-text").value;
    };
    AllJoynTsApp.prototype.OnAzureChanged = function () {
        this.m_ConnectionAzureParam = window.document.getElementById("connection-azure-text").value;
    };
    //----------------------------------------------------------------------------------------------------------
    // OTHER
    //----------------------------------------------------------------------------------------------------------
    AllJoynTsApp.prototype.RetrieveTemplate = function (filename, field) {
        var __this__ = this;
        var client = new XMLHttpRequest();
        client.onreadystatechange = function () {
            if (this.readyState == this.DONE) {
                if (this.status == 200 &&
                    this.responseText != null) {
                    // success!
                    __this__[this["dataField"]] = this.responseText;
                    if (this["dataField"] == "htmlFront")
                        __this__.GoToFrontPage();
                    return;
                }
                else {
                    window.editorScript.setValue(this.status);
                }
            }
        };
        client.open("GET", filename);
        client.send();
        client["dataField"] = field;
    };
    AllJoynTsApp.prototype.AppendLog = function (target, v) {
        var el = window.document.getElementById(target);
        if (null != el) {
            el.innerHTML += v;
            el.scrollTop += 100;
        }
    };
    return AllJoynTsApp;
}());
var app = null;
var editor = null;
var editorScript = null;
window.onload = function () {
    app = new AllJoynTsApp();
    app.start();
};
//# sourceMappingURL=app.js.map