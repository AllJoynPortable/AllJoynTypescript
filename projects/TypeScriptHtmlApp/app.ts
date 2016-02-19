
var editor = null;
var editorScript = null;


enum ConnectionType {
    CONNECTION_LOOPBACK,
    CONNECTION_DISCOVER,
    CONNECTION_WEBSOCKET,
    CONNECTION_AZURE
};

class ExploreDeviceInterface {
    public m_ObjectPath: string;
    public m_Interface: string;
    public m_IntrospectionXml: string;
}

class ExploreDeviceData {
    // AllJoyn node name / identifier
    public m_NodeId: string;

    public m_DeviceName: string = "";
    // XXX - other device details

    public m_Interfaces: Array<ExploreDeviceInterface> = [];
}

class AllJoynTsApp {

    constructor() {
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

    start() {
    }

    stop() {
    }

    //----------------------------------------------------------------------------------------------------------
    // MAIN MENU HANDLING
    //----------------------------------------------------------------------------------------------------------
    GoToFrontPage() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.m_HtmlFront;
        this.MenuHighlight("");
    }

    GoToBootstrap() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.m_HtmlBootstrap;
        this.MenuHighlight("menu-bootstrap");
    }

    GoToCreate() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.m_HtmlCreate;

        (window as any).editor = (window as any).CodeMirror.fromTextArea(window.document.getElementById("introspectionXml"), {
            lineNumbers: true, mode: "text/xml", theme: "ttcn"
        });

        var __this__ = this;
        (window as any).editor.on("change", function (instance, changeObj) {
            console.log("INTROSPECTION XML CHANGED");
            __this__.onDeviceInfoChanged();
        });

        (window as any).editorScript = (window as any).CodeMirror.fromTextArea(window.document.getElementById("generatedCode"), {
            lineNumbers: true, mode: "text/typescript", theme: "ttcn"
        });

        var __this__ = this;
        (window as any).editorScript.on("change", function (instance, changeObj) {

            if (__this__.m_CreateEditingTs) {
                console.log("TS SCRIPT CHANGED");
                __this__.m_CreateCodeJs = "";
                __this__.m_CreateCodeTs = (window as any).editorScript.getValue();
            }
        });

        this.m_CreateLocked = true;
        (window as any).editor.setValue(this.m_CreateIntrospectionXml);

        //(window.document.getElementById("create-application-id") as HTMLInputElement).value = this.m_ApplicationId;
        (window.document.getElementById("create-application-name") as HTMLInputElement).value = this.m_CreateApplicationName;
        (window.document.getElementById("create-device-id") as HTMLInputElement).value = this.m_CreateDeviceId;
        (window.document.getElementById("create-device-name") as HTMLInputElement).value = this.m_CreateDeviceName;
        (window.document.getElementById("create-manufacturer") as HTMLInputElement).value = this.m_CreateManufacturer;
        (window.document.getElementById("create-model-number") as HTMLInputElement).value = this.m_CreateModelNumber;
        this.m_CreateLocked = false;
        this.MenuHighlight("menu-create");
    }

    GoToExplore() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.m_HtmlExplore;
        this.MenuHighlight("menu-explore");
    }

    GoToSamples() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.m_HtmlSamples;
        this.MenuHighlight("menu-samples");
    }

    GoToSetup() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.m_HtmlSetup;

        switch (this.m_ConnectionType) {
            case ConnectionType.CONNECTION_LOOPBACK: (window.document.getElementById("connection-loopback") as HTMLInputElement).checked = true; break;
            case ConnectionType.CONNECTION_DISCOVER: (window.document.getElementById("connection-discover") as HTMLInputElement).checked = true; break;
            case ConnectionType.CONNECTION_WEBSOCKET: (window.document.getElementById("connection-websocket") as HTMLInputElement).checked = true; break;
            case ConnectionType.CONNECTION_AZURE: (window.document.getElementById("connection-azure") as HTMLInputElement).checked = true; break;
        }

        (window.document.getElementById("connection-azure-text") as HTMLInputElement).value = this.m_ConnectionAzureParam;
        (window.document.getElementById("connection-websocket-text") as HTMLInputElement).value = this.m_ConnectionWebsocketParam;
        this.MenuHighlight("menu-setup");
    }

    GoToHelp() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.m_HtmlHelp;
        this.MenuHighlight("menu-help");
    }

    private MenuHighlight(id: string) {
        var menu: HTMLDivElement = window.document.getElementById("menu") as HTMLDivElement;

        var child: Element = menu.firstElementChild;

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
    }

    //----------------------------------------------------------------------------------------------------------
    // CREATE VIEW
    //----------------------------------------------------------------------------------------------------------
    onConnectorEvent(e: AJ.ConnectorEventType, d: any) {
        var el = window.document.getElementById("content");

        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("log-create", "<br/>ALLJOYN CONNECTED");
            //(window.document.getElementById("RouterIcon") as HTMLImageElement).src = "network-green-24.png";
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
    }

    private updateXml() {
    }

    private updateTs() {
        var xml: string = (window as any).editor.getValue();
        //(window.document.getElementById("introspectionXml") as HTMLTextAreaElement).textContent;

        if (this.m_CreateCodeTs == "") {

            var p: Generator.IntrospectionXmlParser = new Generator.IntrospectionXmlParser();

            // first, parse introspection xml
            try {
                p.ParseXml(xml);

            } catch (e) {
                this.AppendLog("log-create", "<br/>" + e);
            }

            this.AppendLog("log-create", "<br/>PARSER FINISHED: " + p.m_ObjectPath + " " + p.m_Interface);

            // create code generator
            var gen: Generator.CodeGeneratorTS = new Generator.CodeGeneratorTS(p.m_Methods);

            gen.SetIntrospectionXml(xml);
            gen.SetIconData(Generator.DEFAULT_DEVICE_ICON_MIME_TYPE, Generator.DEFAULT_DEVICE_ICON_URL, Generator.DEFAULT_DEVICE_ICON);
            gen.SetDeviceData(this.m_CreateApplicationId, this.m_CreateApplicationName, this.m_CreateDeviceId, this.m_CreateDeviceName, this.m_CreateManufacturer, this.m_CreateModelNumber);
            this.m_CreateCodeTs = this.m_TsMsg + this.m_TsConnectorBase + this.m_TsConnectorWebSocket + this.m_TsApplicationBase;


            // XXX - add readers & writers
            //this.m_CreateCodeTs = this.m_CreateCodeTs.replace("/*WRITER-CODE-HERE*/", gen.GenerateWriters());
            //this.m_CreateCodeTs = this.m_CreateCodeTs.replace("/*READER-CODE-HERE*/", gen.GenerateReaders());

            this.m_CreateCodeTs += gen.GenerateApplicationCode();
            this.m_CreateCodeJs = "";
        }
    }

    private updateJs() {
        if (this.m_CreateCodeJs == "") {
            this.updateTs();
            this.m_CreateCodeJs = ConvertTsToJs(this.m_CreateCodeTs);
        }
    }

    public onShowTs() {
        this.updateTs();
        (window as any).editorScript.setValue(this.m_CreateCodeTs);
        this.m_CreateEditingTs = true;
    }

    public onShowJs() {
        this.m_CreateEditingTs = false;
        this.updateJs();
        (window as any).editorScript.setValue(this.m_CreateCodeJs);
    }

    public onTest() {
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

        this.m_CreateConnector.SetConnectorEvent(
            function (e: AJ.ConnectorEventType, d: any) {
                self.onConnectorEvent(e, d);
            });

        this.m_CreateConnector.SetApplication(new AJ.Application())
        this.m_CreateConnector.ConnectAndAuthenticate();
    }

    public onDeviceInfoChanged() {
        this.m_CreateCodeJs = "";
        this.m_CreateCodeTs = "";

        if (!this.m_CreateLocked) {
            // XXX - fix this
            //this.m_ApplicationId = (window.document.getElementById("create-application-id") as HTMLInputElement).value;
            this.m_CreateApplicationName = (window.document.getElementById("create-application-name") as HTMLInputElement).value;
            this.m_CreateDeviceId = (window.document.getElementById("create-device-id") as HTMLInputElement).value;
            this.m_CreateDeviceName = (window.document.getElementById("create-device-name") as HTMLInputElement).value;
            this.m_CreateManufacturer = (window.document.getElementById("create-manufacturer") as HTMLInputElement).value;
            this.m_CreateModelNumber = (window.document.getElementById("create-model-number") as HTMLInputElement).value;
        }
    }

    //----------------------------------------------------------------------------------------------------------
    // EXPLORE VIEW
    //----------------------------------------------------------------------------------------------------------
    public onExploreConnect() {

        this.AppendLog("log-explore", "<br/>CONNECTING....");

        // try to restart with new service
        if (null != this.m_ExploreConnector) {
            this.m_ExploreConnector.Disconnect();
        }

        this.m_ExploreConnector = new AJ.ConnectorWebSocket();
        var self = this;

        this.m_ExploreConnector.SetConnectorEvent(
            function (e: AJ.ConnectorEventType, d: any) {
                self.onExploreConnectorEvent(e, d);
            });

        this.m_ExploreConnector.SetAnnouncementListener(function (sender: string, q1: number, q2: number, o1: any, o2: any) {
            self.onExploreAnnouncement(sender, q1, q2, o1, o2);
        });
        this.m_ExploreConnector.ConnectAndAuthenticate();
    }

    public onExploreAnnouncement(sender: string, q1: number, q2: number, o1: any, o2: any): void {
        var self = this;
        this.AppendLog("log-explore", "<br/>ANNOUNCEMENT RECEIVED FROM: " + sender);

        for (var o of o1) {
            this.AppendLog("log-explore", "<br/>" + o[0] + " - " + o[1][0]);

            //if (o[0] == "/About")
            //    continue;

            //if (o[0] == "/About/DeviceIcon")
            //    continue;

            AJ.org_freedesktop_dbus_introspectable.method__Introspect(self.m_ExploreConnector, sender, o[0] as string, function (connection: AJ.ConnectorBase, xml: string) {

                self.AppendLog("log-explore", "<br/>XML RECEIVED");

                // XXX - create some html
                var p: Generator.IntrospectionXmlParser = new Generator.IntrospectionXmlParser();

                // first, parse introspection xml
                try {
                    p.ParseXml(xml);

                } catch (e) {
                    self.AppendLog("log-explore", "<br/>" + e);
                }

                self.AppendLog("log-explore", "<br/>PARSER FINISHED: " + p.m_ObjectPath + " " + p.m_Interface);

                // create code generator
                var gen: Generator.CodeGeneratorHTML = new Generator.CodeGeneratorHTML(p.m_Methods);

                var el: HTMLDivElement = window.document.getElementById("explore-form") as HTMLDivElement;
                gen.GenerateForm(el, window.document);
            });
        }

        return;

    }

    private onExploreConnectorEvent(e: AJ.ConnectorEventType, d: any) {
        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("log-explore", "<br/>ALLJOYN CONNECTED");
            //(window.document.getElementById("RouterIcon") as HTMLImageElement).src = "network-green-24.png";
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
    }

    private onMethodSignalCall(iface: string, ms: string) {
        this.AppendLog("log-explore", "<br/>CALLING METHOD/SIGNAL: " + iface + " " + ms);


        // create code generator
        var gen: Generator.CodeGeneratorHTML = new Generator.CodeGeneratorHTML(null);


        var data: any = gen.CreateDataFromFields(window.document, iface, "ss");

        this.AppendLog("log-explore", "<br/>DATA: " + data[0] + " " + data[1]);

    }
    //----------------------------------------------------------------------------------------------------------
    // SETUP VIEW
    //----------------------------------------------------------------------------------------------------------

    OnLoopbackSelected() {
        this.m_ConnectionType = ConnectionType.CONNECTION_LOOPBACK;
    }

    OnDiscoverSelected() {
        this.m_ConnectionType = ConnectionType.CONNECTION_DISCOVER;
    }

    OnWebsocketSelected() {
        this.m_ConnectionType = ConnectionType.CONNECTION_WEBSOCKET;
    }

    OnAzureSelected() {
        this.m_ConnectionType = ConnectionType.CONNECTION_AZURE;
    }

    OnWebsocketChanged() {
        this.m_ConnectionWebsocketParam = (window.document.getElementById("connection-websocket-text") as HTMLInputElement).value;
    }

    OnAzureChanged() {
        this.m_ConnectionAzureParam = (window.document.getElementById("connection-azure-text") as HTMLInputElement).value;
    }

    //----------------------------------------------------------------------------------------------------------
    // OTHER
    //----------------------------------------------------------------------------------------------------------

    private RetrieveTemplate(filename: string, field: string) {
        var __this__ = this;
        var client = new XMLHttpRequest();
        client.onreadystatechange = function () {
            if (this.readyState == this.DONE) {
                if (this.status == 200 &&
                    this.responseText != null) {
                    // success!
                    

                    __this__[this["dataField"]] = this.responseText;

                    if (this["dataField"] == "htmlFront") __this__.GoToFrontPage();
                    return;
                }
                else {
                    (window as any).editorScript.setValue(this.status);

                    //(window.document.getElementById("generatedCode") as HTMLTextAreaElement).textContent = this.status;
                }
            }
        };
        client.open("GET", filename);
        client.send();
        client["dataField"] = field;
    }

    private AppendLog(target: string, v: string) {
        var el = window.document.getElementById(target);

        if (null != el) {
            el.innerHTML += v;
            el.scrollTop += 100;
        }
    }

    //----------------------------------------------------------------------------------------------------------
    // MEMBERS
    //----------------------------------------------------------------------------------------------------------

    // HTML fragments
    private m_HtmlFront: string = "";
    private m_HtmlBootstrap: string = "";
    private m_HtmlCreate: string = "";
    private m_HtmlExplore: string = "";
    private m_HtmlSamples: string = "";
    private m_HtmlSetup: string = "";
    private m_HtmlHelp: string = "";

    // create view variables
    private m_CreateConnector: AJ.ConnectorWebSocket = null;
    private m_CreateIntrospectionXml: string = "";
    private m_CreateEditingTs = false;
    private m_CreateCodeTs: string = "";
    private m_CreateCodeJs: string = "";

    private m_CreateApplicationId: Uint8Array = Generator.DEFAULT_APP_ID;
    private m_CreateApplicationName: string = Generator.DEFAULT_APP_NAME;
    private m_CreateDeviceId: string = Generator.DEFAULT_DEVICE_ID;
    private m_CreateDeviceName: string = Generator.DEFAULT_DEVICE_NAME;
    private m_CreateManufacturer: string = Generator.DEFAULT_MANUFACTURER;
    private m_CreateModelNumber: string = Generator.DEFAULT_MODEL_NUMBER;
    private m_CreateLocked: boolean = false;

    private m_TsMsg: string = "";
    private m_TsConnectorBase: string = "";
    private m_TsConnectorWebSocket: string = "";
    private m_TsApplicationBase: string = "";


    // explore variables
    private m_ExploreConnector: AJ.ConnectorWebSocket = null;
    private m_ExploreDeviceData: Array<ExploreDeviceData> = [];
    private m_ExploreCurrentDevice: ExploreDeviceData = null;

    // setup variables
    private m_ConnectionType: ConnectionType = ConnectionType.CONNECTION_WEBSOCKET;
    private m_ConnectionAzureParam: string = "<azure connection string>";
    private m_ConnectionWebsocketParam: string = "ws://127.0.0.1:8088";
}

var app = null;
var editor = null;
var editorScript = null;

window.onload = () => {
    app = new AllJoynTsApp();
    app.start();
};
