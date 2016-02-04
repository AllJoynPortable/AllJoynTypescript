
class Greeter {
    element: HTMLElement;
    span: HTMLElement;
    timerToken: number;
    connector: AJ.ConnectorWebSocket;
    templateTS: string = "";
    templateWebSocketTS: string = "";
    templateJS: string = "";
    templateWebSocketJS: string = "";

    constructor(element: HTMLElement) {
        this.element = element;
        this.AppendLog("The time is: ");
        this.span = document.createElement('span');
        this.element.appendChild(this.span);
        this.span.innerText = new Date().toUTCString();

        //(window.document.getElementById("introspectionXml") as HTMLTextAreaElement).textContent = Generator.DEFAULT_APP_INTROSPECTION_XML.replace(/></g, ">\r\n<");
        (window as any).editor.setValue(Generator.DEFAULT_APP_INTROSPECTION_XML.replace(/></g, ">\r\n<"));

        this.RetrieveTemplate("template.ts.txt", "templateTS");
        this.RetrieveTemplate("template-websocket.ts.txt", "templateWebSocketTS");
        this.RetrieveTemplate("template.js.txt", "templateJS");
        this.RetrieveTemplate("template-websocket.js.txt", "templateWebSocketJS");
    }

    start() {
        this.element.innerHTML = "";

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
        var el = this.element;

        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("<br/>ALLJOYN CONNECTED");
            (window.document.getElementById("RouterIcon") as HTMLImageElement).src = "network-green-24.png";
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

    private RetrieveTemplate(filename: string, field: string) {
        var __this__ = this;
        var client = new XMLHttpRequest();
        client.onreadystatechange = function () {
            if (this.readyState == this.DONE) {
                if (this.status == 200 &&
                    this.responseText != null) {
                    // success!
                    

                    __this__[this["dataField"]] = this.responseText;
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
        var el = this.element;
        el.innerHTML += v;
        el.scrollTop += 100;
    }
}

var greeter = null;

window.onload = () => {
    var el = document.getElementById('content');
    greeter = new Greeter(el);
    greeter.start();
};
