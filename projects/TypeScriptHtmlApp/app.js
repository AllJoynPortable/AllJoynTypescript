var Greeter = (function () {
    function Greeter(element) {
        this.templateTS = "";
        this.templateWebSocketTS = "";
        this.templateJS = "";
        this.templateWebSocketJS = "";
        this.element = element;
        this.AppendLog("The time is: ");
        this.span = document.createElement('span');
        this.element.appendChild(this.span);
        this.span.innerText = new Date().toUTCString();
        //(window.document.getElementById("introspectionXml") as HTMLTextAreaElement).textContent = Generator.DEFAULT_APP_INTROSPECTION_XML.replace(/></g, ">\r\n<");
        window.editor.setValue(Generator.DEFAULT_APP_INTROSPECTION_XML.replace(/></g, ">\r\n<"));
        this.RetrieveTemplate("template.ts.txt", "templateTS");
        this.RetrieveTemplate("template-websocket.ts.txt", "templateWebSocketTS");
        this.RetrieveTemplate("template.js.txt", "templateJS");
        this.RetrieveTemplate("template-websocket.js.txt", "templateWebSocketJS");
    }
    Greeter.prototype.start = function () {
        this.element.innerHTML = "";
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
    Greeter.prototype.stop = function () {
        clearTimeout(this.timerToken);
    };
    Greeter.prototype.onConnectorEvent = function (e, d) {
        var el = this.element;
        if (e == AJ.ConnectorEventType.ConnectorEventConnected) {
            this.AppendLog("<br/>ALLJOYN CONNECTED");
            window.document.getElementById("RouterIcon").src = "network-green-24.png";
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
    Greeter.prototype.onGenerate = function () {
        var xml = window.editor.getValue();
        //(window.document.getElementById("introspectionXml") as HTMLTextAreaElement).textContent;
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
        var out = this.templateTS;
        out = out.replace("/*WRITER-CODE-HERE*/", gen.GenerateWriters());
        out = out.replace("/*READER-CODE-HERE*/", gen.GenerateReaders());
        out = out.replace("/*APPLICATION-CODE-HERE*/", gen.GenerateApplicationCode());
        out = out.replace("/*CONNECTOR-CODE-HERE*/", this.templateWebSocketTS);
        window.editorScript.setValue(out);
        //(window.document.getElementById("generatedCode") as HTMLTextAreaElement).textContent = out;
    };
    Greeter.prototype.onTest = function () {
        var xml = window.editor.getValue();
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
        gen.EnableJsOnly();
        gen.SetIntrospectionXml(xml);
        gen.SetIconData(Generator.DEFAULT_DEVICE_ICON_MIME_TYPE, Generator.DEFAULT_DEVICE_ICON_URL, Generator.DEFAULT_DEVICE_ICON);
        gen.SetDeviceData(Generator.DEFAULT_APP_ID, Generator.DEFAULT_APP_NAME, Generator.DEFAULT_DEVICE_ID, Generator.DEFAULT_DEVICE_NAME, Generator.DEFAULT_MANUFACTURER, Generator.DEFAULT_MODEL_NUMBER);
        var out = this.templateJS;
        out = out.replace("/*WRITER-CODE-HERE*/", gen.GenerateWriters());
        out = out.replace("/*READER-CODE-HERE*/", gen.GenerateReaders());
        out = out.replace("/*APPLICATION-CODE-HERE*/", gen.GenerateApplicationCode());
        out = out.replace("/*CONNECTOR-CODE-HERE*/", this.templateWebSocketJS);
        window.editorScript.setValue(out);
        //(window.document.getElementById("generatedCode") as HTMLTextAreaElement).textContent = out;
        // this should reload script
        var geval = eval;
        geval(out);
        // try to restart with new service
        this.start();
    };
    Greeter.prototype.RetrieveTemplate = function (filename, field) {
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
                    window.editorScript.setValue(this.status);
                }
            }
        };
        client.open("GET", filename);
        client.send();
        client["dataField"] = field;
    };
    Greeter.prototype.AppendLog = function (v) {
        var el = this.element;
        el.innerHTML += v;
        el.scrollTop += 100;
    };
    return Greeter;
})();
var greeter = null;
window.onload = function () {
    var el = document.getElementById('content');
    greeter = new Greeter(el);
    greeter.start();
};
//# sourceMappingURL=app.js.map