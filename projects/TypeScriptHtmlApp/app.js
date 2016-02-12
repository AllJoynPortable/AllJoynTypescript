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
var AllJoynTsApp = (function () {
    function AllJoynTsApp() {
        this.templateTS = "";
        this.templateWebSocketTS = "";
        this.templateJS = "";
        this.templateWebSocketJS = "";
        // HTML fragments
        this.htmlFront = "";
        this.htmlBootstrap = "";
        this.htmlCreate = "";
        this.htmlExplore = "";
        this.htmlSamples = "";
        this.htmlSetup = "";
        this.htmlHelp = "";
        this.connectionType = ConnectionType.CONNECTION_WEBSOCKET;
        this.connectionAzureParam = "<azure connection string>";
        this.connectionWebsocketParam = "ws://127.0.0.1:8088";
        // create
        this.introspectionXml = "";
        this.editingTs = false;
        this.codeTs = "";
        this.codeJs = "";
        this.m_ApplicationId = Generator.DEFAULT_APP_ID.toString();
        this.m_ApplicationName = Generator.DEFAULT_APP_NAME;
        this.m_DeviceId = Generator.DEFAULT_DEVICE_ID;
        this.m_DeviceName = Generator.DEFAULT_DEVICE_NAME;
        this.m_Manufacturer = Generator.DEFAULT_MANUFACTURER;
        this.m_ModelNumber = Generator.DEFAULT_MODEL_NUMBER;
        this.AppendLog("The time is: ");
        this.span = document.createElement('span');
        this.span.innerText = new Date().toUTCString();
        this.introspectionXml = Generator.DEFAULT_APP_INTROSPECTION_XML.replace(/></g, ">\r\n<");
        //(window as any).editor.setValue(this.introspectionXml);
        this.RetrieveTemplate("template.ts.txt", "templateTS");
        this.RetrieveTemplate("template-websocket.ts.txt", "templateWebSocketTS");
        this.RetrieveTemplate("template.js.txt", "templateJS");
        this.RetrieveTemplate("template-websocket.js.txt", "templateWebSocketJS");
        this.RetrieveTemplate("front.html", "htmlFront");
        this.RetrieveTemplate("bootstrap.html", "htmlBootstrap");
        this.RetrieveTemplate("create.html", "htmlCreate");
        this.RetrieveTemplate("explore.html", "htmlExplore");
        this.RetrieveTemplate("samples.html", "htmlSamples");
        this.RetrieveTemplate("setup.html", "htmlSetup");
        this.RetrieveTemplate("help.html", "htmlHelp");
    }
    AllJoynTsApp.prototype.start = function () {
        if (null != this.connector) {
            this.connector.Disconnect();
        }
        this.connector = null;
        this.connector = new AJ.ConnectorWebSocket();
        var self = this;
        this.connector.SetConnectorEvent(function (e, d) {
            self.onConnectorEvent(e, d);
        });
        this.connector.ConnectAndAuthenticate();
    };
    AllJoynTsApp.prototype.stop = function () {
        clearTimeout(this.timerToken);
    };
    AllJoynTsApp.prototype.onConnectorEvent = function (e, d) {
        var el = window.document.getElementById("content");
        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("<br/>ALLJOYN CONNECTED");
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventConnectionFailed) {
            this.AppendLog("<br/>ALLJOYN CONNECTION FAILED");
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventTextSent) {
            this.AppendLog("<br/>AUTH >> " + d);
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventTextReceived) {
            this.AppendLog("<br/>AUTH << " + d);
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventMsgSent) {
            this.AppendLog("<br/>Message Sent: " + d.hdr_GetMsgType() + " " + d.hdr_GetMember());
        }
        else if (e == AJ.ConnectorEventType.ConnectorEventMsgReceived) {
            this.AppendLog("<br/>Message Received: " + d.hdr_GetMsgType() + " " + d.hdr_GetMember());
        }
    };
    AllJoynTsApp.prototype.updateXml = function () {
    };
    AllJoynTsApp.prototype.updateTs = function () {
        var xml = window.editor.getValue();
        //(window.document.getElementById("introspectionXml") as HTMLTextAreaElement).textContent;
        if (this.codeTs == "") {
            var p = new Generator.IntrospectionXmlParser();
            // first, parse introspection xml
            try {
                p.ParseXml(xml);
            }
            catch (e) {
                this.AppendLog("<br/>" + e);
            }
            this.AppendLog("<br/>PARSER FINISHED: " + p.m_ObjectPath + " " + p.m_Interface);
            // create code generator
            var gen = new Generator.CodeGeneratorTS(p.m_Methods);
            gen.SetIntrospectionXml(xml);
            gen.SetIconData(Generator.DEFAULT_DEVICE_ICON_MIME_TYPE, Generator.DEFAULT_DEVICE_ICON_URL, Generator.DEFAULT_DEVICE_ICON);
            gen.SetDeviceData(Generator.DEFAULT_APP_ID, Generator.DEFAULT_APP_NAME, Generator.DEFAULT_DEVICE_ID, Generator.DEFAULT_DEVICE_NAME, Generator.DEFAULT_MANUFACTURER, Generator.DEFAULT_MODEL_NUMBER);
            this.codeTs = this.templateTS;
            this.codeTs = this.codeTs.replace("/*WRITER-CODE-HERE*/", gen.GenerateWriters());
            this.codeTs = this.codeTs.replace("/*READER-CODE-HERE*/", gen.GenerateReaders());
            this.codeTs = this.codeTs.replace("/*APPLICATION-CODE-HERE*/", gen.GenerateApplicationCode());
            this.codeTs = this.codeTs.replace("/*CONNECTOR-CODE-HERE*/", this.templateWebSocketTS);
            this.codeJs = "";
        }
    };
    AllJoynTsApp.prototype.updateJs = function () {
        if (this.codeJs == "") {
            this.updateTs();
            this.codeJs = ConvertTsToJs(this.codeTs);
        }
    };
    AllJoynTsApp.prototype.onShowTs = function () {
        this.updateTs();
        window.editorScript.setValue(this.codeTs);
        this.editingTs = true;
    };
    AllJoynTsApp.prototype.onShowJs = function () {
        this.editingTs = false;
        this.updateJs();
        window.editorScript.setValue(this.codeJs);
    };
    AllJoynTsApp.prototype.onTest = function () {
        this.updateJs();
        var geval = eval;
        geval(this.codeJs);
        // try to restart with new service
        this.start();
    };
    AllJoynTsApp.prototype.GoToFrontPage = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.htmlFront;
        this.MenuHighlight("");
    };
    AllJoynTsApp.prototype.GoToBootstrap = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.htmlBootstrap;
        this.MenuHighlight("menu-bootstrap");
    };
    AllJoynTsApp.prototype.GoToCreate = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.htmlCreate;
        window.editor = window.CodeMirror.fromTextArea(window.document.getElementById("introspectionXml"), {
            lineNumbers: true, mode: "text/xml", theme: "ttcn"
        });
        var __this__ = this;
        window.editor.on("change", function (instance, changeObj) {
            console.log("INTROSPECTION XML CHANGED");
            __this__.codeJs = "";
            __this__.codeTs = "";
        });
        window.editorScript = window.CodeMirror.fromTextArea(window.document.getElementById("generatedCode"), {
            lineNumbers: true, mode: "text/typescript", theme: "ttcn"
        });
        var __this__ = this;
        window.editorScript.on("change", function (instance, changeObj) {
            if (__this__.editingTs) {
                console.log("TS SCRIPT CHANGED");
                __this__.codeJs = "";
                __this__.codeTs = window.editorScript.getValue();
            }
        });
        window.editor.setValue(this.introspectionXml);
        window.document.getElementById("create-application-id").value = this.m_ApplicationId;
        window.document.getElementById("create-application-name").value = this.m_ApplicationName;
        window.document.getElementById("create-device-id").value = this.m_DeviceId;
        window.document.getElementById("create-device-name").value = this.m_DeviceName;
        window.document.getElementById("create-manufacturer").value = this.m_Manufacturer;
        window.document.getElementById("create-model-number").value = this.m_ModelNumber;
        this.MenuHighlight("menu-create");
    };
    AllJoynTsApp.prototype.GoToExplore = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.htmlExplore;
        this.MenuHighlight("menu-explore");
    };
    AllJoynTsApp.prototype.GoToSamples = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.htmlSamples;
        this.MenuHighlight("menu-samples");
    };
    AllJoynTsApp.prototype.GoToSetup = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.htmlSetup;
        switch (this.connectionType) {
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
        window.document.getElementById("connection-azure-text").value = this.connectionAzureParam;
        window.document.getElementById("connection-websocket-text").value = this.connectionWebsocketParam;
        this.MenuHighlight("menu-setup");
    };
    AllJoynTsApp.prototype.GoToHelp = function () {
        var el = window.document.getElementById("main");
        el.innerHTML = this.htmlHelp;
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
    AllJoynTsApp.prototype.OnLoopbackSelected = function () {
        this.connectionType = ConnectionType.CONNECTION_LOOPBACK;
    };
    AllJoynTsApp.prototype.OnDiscoverSelected = function () {
        this.connectionType = ConnectionType.CONNECTION_DISCOVER;
    };
    AllJoynTsApp.prototype.OnWebsocketSelected = function () {
        this.connectionType = ConnectionType.CONNECTION_WEBSOCKET;
    };
    AllJoynTsApp.prototype.OnAzureSelected = function () {
        this.connectionType = ConnectionType.CONNECTION_AZURE;
    };
    AllJoynTsApp.prototype.OnWebsocketChanged = function () {
        this.connectionWebsocketParam = window.document.getElementById("connection-websocket-text").value;
    };
    AllJoynTsApp.prototype.OnAzureChanged = function () {
        this.connectionAzureParam = window.document.getElementById("connection-azure-text").value;
    };
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
    AllJoynTsApp.prototype.AppendLog = function (v) {
        var el = window.document.getElementById("content");
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