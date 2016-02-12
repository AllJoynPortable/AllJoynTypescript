
var editor = null;
var editorScript = null;


enum ConnectionType {
    CONNECTION_LOOPBACK,
    CONNECTION_DISCOVER,
    CONNECTION_WEBSOCKET,
    CONNECTION_AZURE
};


class AllJoynTsApp {

    span: HTMLElement;
    timerToken: number;
    connector: AJ.ConnectorWebSocket;
    templateTS: string = "";
    templateWebSocketTS: string = "";
    templateJS: string = "";
    templateWebSocketJS: string = "";

    // HTML fragments
    htmlFront: string = "";
    htmlBootstrap: string = "";
    htmlCreate: string = "";
    htmlExplore: string = "";
    htmlSamples: string = "";
    htmlSetup: string = "";
    htmlHelp: string = "";

    connectionType: ConnectionType = ConnectionType.CONNECTION_WEBSOCKET;
    connectionAzureParam: string = "<azure connection string>";
    connectionWebsocketParam: string = "ws://127.0.0.1:8088";

    introspectionXml: string = "";

    constructor() {
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

    start() {
        if (null != this.connector) {
            this.connector.Disconnect();
        }

        this.connector = null;

        this.connector = new AJ.ConnectorWebSocket();
        var self = this;

        this.connector.SetConnectorEvent(
            function (e: AJ.ConnectorEventType, d: any) {
                self.onConnectorEvent(e, d);
            });
        this.connector.ConnectAndAuthenticate();
    }

    stop() {
        clearTimeout(this.timerToken);
    }

    onConnectorEvent(e: AJ.ConnectorEventType, d: any) {
        var el = window.document.getElementById("content");

        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("<br/>ALLJOYN CONNECTED");
            //(window.document.getElementById("RouterIcon") as HTMLImageElement).src = "network-green-24.png";
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
    }

    public onGenerate() {
        var xml: string = (window as any).editor.getValue();
            //(window.document.getElementById("introspectionXml") as HTMLTextAreaElement).textContent;

        var p: Generator.IntrospectionXmlParser = new Generator.IntrospectionXmlParser();

        // first, parse introspection xml
        try {
            p.ParseXml(xml);

        } catch (e) {
            this.AppendLog("<br/>" + e);
        }

        this.AppendLog("<br/>PARSER FINISHED: " + p.m_ObjectPath + " " + p.m_Interface);

        // create code generator
        var gen: Generator.CodeGeneratorTS = new Generator.CodeGeneratorTS(p.m_Methods);

        gen.SetIntrospectionXml(xml);
        gen.SetIconData(Generator.DEFAULT_DEVICE_ICON_MIME_TYPE, Generator.DEFAULT_DEVICE_ICON_URL, Generator.DEFAULT_DEVICE_ICON);
        gen.SetDeviceData(Generator.DEFAULT_APP_ID, Generator.DEFAULT_APP_NAME, Generator.DEFAULT_DEVICE_ID, Generator.DEFAULT_DEVICE_NAME, Generator.DEFAULT_MANUFACTURER, Generator.DEFAULT_MODEL_NUMBER);
        var out: string = this.templateTS;

        out = out.replace("/*WRITER-CODE-HERE*/", gen.GenerateWriters());
        out = out.replace("/*READER-CODE-HERE*/", gen.GenerateReaders());
        out = out.replace("/*APPLICATION-CODE-HERE*/", gen.GenerateApplicationCode());
        out = out.replace("/*CONNECTOR-CODE-HERE*/", this.templateWebSocketTS);

        (window as any).editorScript.setValue(out);
        //(window.document.getElementById("generatedCode") as HTMLTextAreaElement).textContent = out;

    }

    public onGenerateJs() {
        var ts: string = (window as any).editorScript.getValue();

        console.log(ts);
        var out: string = ConvertTsToJs(ts);
        (window as any).editorScript.setValue(out);
    }

    public onTest() {
        var xml: string = (window as any).editor.getValue();
        var p: Generator.IntrospectionXmlParser = new Generator.IntrospectionXmlParser();

        // first, parse introspection xml
        try {
            p.ParseXml(xml);

        } catch (e) {
            this.AppendLog("<br/>" + e);
        }

        this.AppendLog("<br/>PARSER FINISHED: " + p.m_ObjectPath + " " + p.m_Interface);

        // create code generator
        var gen: Generator.CodeGeneratorTS = new Generator.CodeGeneratorTS(p.m_Methods);

        gen.EnableJsOnly();
        gen.SetIntrospectionXml(xml);
        gen.SetIconData(Generator.DEFAULT_DEVICE_ICON_MIME_TYPE, Generator.DEFAULT_DEVICE_ICON_URL, Generator.DEFAULT_DEVICE_ICON);
        gen.SetDeviceData(Generator.DEFAULT_APP_ID, Generator.DEFAULT_APP_NAME, Generator.DEFAULT_DEVICE_ID, Generator.DEFAULT_DEVICE_NAME, Generator.DEFAULT_MANUFACTURER, Generator.DEFAULT_MODEL_NUMBER);
        var out: string = this.templateJS;

        out = out.replace("/*WRITER-CODE-HERE*/", gen.GenerateWriters());
        out = out.replace("/*READER-CODE-HERE*/", gen.GenerateReaders());
        out = out.replace("/*APPLICATION-CODE-HERE*/", gen.GenerateApplicationCode());
        out = out.replace("/*CONNECTOR-CODE-HERE*/", this.templateWebSocketJS);

        (window as any).editorScript.setValue(out);

        //(window.document.getElementById("generatedCode") as HTMLTextAreaElement).textContent = out;

        // this should reload script
        var geval = eval;
        geval(out);

        // try to restart with new service
        this.start();
    }

    GoToFrontPage() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.htmlFront;
        this.MenuHighlight("");
    }

    GoToBootstrap() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.htmlBootstrap;
        this.MenuHighlight("menu-bootstrap");
    }

    GoToCreate() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.htmlCreate;

        (window as any).editor = (window as any).CodeMirror.fromTextArea(window.document.getElementById("introspectionXml"), {
            lineNumbers: true, mode: "text/xml", theme: "ttcn"
        });
        (window as any).editorScript = (window as any).CodeMirror.fromTextArea(window.document.getElementById("generatedCode"), {
            lineNumbers: true, mode: "text/typescript", theme: "ttcn"
        });

        (window as any).editor.setValue(this.introspectionXml);
        this.MenuHighlight("menu-create");
    }

    GoToExplore() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.htmlExplore;
        this.MenuHighlight("menu-explore");
    }

    GoToSamples() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.htmlSamples;
        this.MenuHighlight("menu-samples");
    }

    GoToSetup() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.htmlSetup;

        switch (this.connectionType) {
            case ConnectionType.CONNECTION_LOOPBACK: (window.document.getElementById("connection-loopback") as HTMLInputElement).checked = true; break;
            case ConnectionType.CONNECTION_DISCOVER: (window.document.getElementById("connection-discover") as HTMLInputElement).checked = true; break;
            case ConnectionType.CONNECTION_WEBSOCKET: (window.document.getElementById("connection-websocket") as HTMLInputElement).checked = true; break;
            case ConnectionType.CONNECTION_AZURE: (window.document.getElementById("connection-azure") as HTMLInputElement).checked = true; break;
        }

        (window.document.getElementById("connection-azure-text") as HTMLInputElement).value = this.connectionAzureParam;
        (window.document.getElementById("connection-websocket-text") as HTMLInputElement).value = this.connectionWebsocketParam;
        this.MenuHighlight("menu-setup");
    }

    GoToHelp() {
        var el = window.document.getElementById("main");
        (el as HTMLElement).innerHTML = this.htmlHelp;
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

    OnLoopbackSelected() {
        this.connectionType = ConnectionType.CONNECTION_LOOPBACK;
    }

    OnDiscoverSelected() {
        this.connectionType = ConnectionType.CONNECTION_DISCOVER;
    }

    OnWebsocketSelected() {
        this.connectionType = ConnectionType.CONNECTION_WEBSOCKET;
    }

    OnAzureSelected() {
        this.connectionType = ConnectionType.CONNECTION_AZURE;
    }

    OnWebsocketChanged() {
        this.connectionWebsocketParam = (window.document.getElementById("connection-websocket-text") as HTMLInputElement).value;
    }

    OnAzureChanged() {
        this.connectionAzureParam = (window.document.getElementById("connection-azure-text") as HTMLInputElement).value;
    }

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

    private AppendLog(v: string) {
        var el = window.document.getElementById("content");

        if (null != el) {
            el.innerHTML += v;
            el.scrollTop += 100;
        }
    }
}

var app = null;
var editor = null;
var editorScript = null;

window.onload = () => {
    app = new AllJoynTsApp();
    app.start();
};
