var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Generator;
(function (Generator) {
    (function (InterfaceItemType) {
        InterfaceItemType[InterfaceItemType["Method"] = 0] = "Method";
        InterfaceItemType[InterfaceItemType["Signal"] = 1] = "Signal";
        InterfaceItemType[InterfaceItemType["PropertyRW"] = 2] = "PropertyRW";
        InterfaceItemType[InterfaceItemType["PropertyRO"] = 3] = "PropertyRO";
    })(Generator.InterfaceItemType || (Generator.InterfaceItemType = {}));
    var InterfaceItemType = Generator.InterfaceItemType;
    ;
    var InterfaceItemDescription = (function () {
        function InterfaceItemDescription() {
            this.m_ParametersIn = new Array();
            this.m_ParametersReply = new Array();
        }
        return InterfaceItemDescription;
    })();
    Generator.InterfaceItemDescription = InterfaceItemDescription;
    var ParamDescription = (function () {
        function ParamDescription(dt, name) {
            this.m_DataType = "";
            this.m_Name = "";
            this.m_DataType = dt;
            this.m_Name = name;
        }
        return ParamDescription;
    })();
    Generator.ParamDescription = ParamDescription;
    var IntrospectionXmlParser = (function () {
        function IntrospectionXmlParser() {
            this.m_ObjectPath = "";
            this.m_Interface = "";
            this.m_Methods = new Array();
        }
        IntrospectionXmlParser.prototype.ParseXml = function (xml) {
            var xmlDoc = (new window.DOMParser()).parseFromString(xml, "text/xml");
            var el = xmlDoc.getElementsByTagName("node");
            var objectNameAttribute = el[0].attributes.getNamedItem("name");
            this.m_ObjectPath = (null != objectNameAttribute) ? objectNameAttribute.nodeValue : "";
            el = xmlDoc.getElementsByTagName("interface");
            this.m_Interface = el[0].attributes.getNamedItem("name").nodeValue;
            this.DeviceTabAddObjectFromXml(xmlDoc);
        };
        IntrospectionXmlParser.prototype.DeviceTabAddObjectFromXml = function (xmlDoc) {
            var ie = xmlDoc.firstChild;
            ie = ie.firstChild;
            while (null != ie) {
                var im = ie.firstChild;
                var t;
                while (null != im) {
                    var interfaceName = ie.attributes.getNamedItem("name").nodeValue;
                    var name = "";
                    var methodName = "";
                    if (im.nodeName == "method") {
                        name = "?";
                        t = InterfaceItemType.Method;
                    }
                    else if (im.nodeName == "signal") {
                        name = "!";
                        t = InterfaceItemType.Signal;
                    }
                    else if (im.nodeName == "property") {
                        name = "@";
                        var access = im.attributes.getNamedItem("access").nodeValue;
                        if (access == "read") {
                            t = InterfaceItemType.PropertyRO;
                        }
                        else {
                            t = InterfaceItemType.PropertyRW;
                        }
                    }
                    else {
                        im = im.nextSibling;
                        continue;
                    }
                    // XXX what else???
                    // get attribute
                    methodName = im.attributes.getNamedItem("name").nodeValue;
                    name += methodName;
                    // get arguments
                    var ia = im.firstChild;
                    var sig_in = "";
                    var sig_out = "";
                    var md = new InterfaceItemDescription();
                    var counters = new Object();
                    while (null != ia) {
                        if (ia.nodeName == "arg") {
                            var typeNode = ia.attributes.getNamedItem("type");
                            var directionNode = ia.attributes.getNamedItem("direction");
                            var nameNode = ia.attributes.getNamedItem("name");
                            var type = (null != typeNode) ? typeNode.nodeValue : "null";
                            var direction = (null != directionNode) ? directionNode.nodeValue : "in";
                            // XXX - change this to out!!! but requires changes in code generator as well... and other parts
                            if (t == InterfaceItemType.Signal)
                                direction = "in";
                            var paramName = "";
                            if (null != nameNode) {
                                paramName = nameNode.nodeValue;
                            }
                            else {
                                var idx = 0;
                                if (!isNaN(counters[type])) {
                                    idx = ++counters[type];
                                }
                                else {
                                    idx = 1;
                                    counters[type] = idx;
                                }
                                paramName = type + idx;
                            }
                            if (direction == "out") {
                                //if (!this.SignatureHelper_ValidateSignature(type, true))
                                //    throw new Exception("Invalid signature: '" + type + "'");
                                sig_out += type;
                                md.m_ParametersReply.push(new ParamDescription(type, paramName));
                            }
                            else if (direction == "in") {
                                //if (!this.SignatureHelper_ValidateSignature(type, true))
                                //    throw new Exception("Invalid signature: '" + type + "'");
                                sig_in += type;
                                md.m_ParametersIn.push(new ParamDescription(type, paramName));
                            }
                        }
                        ia = ia.nextSibling;
                    }
                    var method = " [" + this.m_ObjectPath + "]" + name;
                    if (sig_in != "") {
                        method += " >" + sig_in;
                    }
                    if (sig_out != "") {
                        method += " <" + sig_out;
                    }
                    md.m_Description = method;
                    md.m_Name = methodName;
                    md.m_ObjectPath = this.m_ObjectPath;
                    md.m_SignatureIn = sig_in;
                    md.m_SignatureReply = sig_out;
                    md.m_Interface = interfaceName;
                    md.m_InterfaceItemType = t;
                    this.m_Methods.push(md);
                    im = im.nextSibling;
                }
                ie = ie.nextSibling;
            }
        };
        return IntrospectionXmlParser;
    })();
    Generator.IntrospectionXmlParser = IntrospectionXmlParser;
    var ObjectHandler = (function () {
        function ObjectHandler(signature, code) {
            this.m_Signature = signature;
            this.m_Code = code;
        }
        return ObjectHandler;
    })();
    var CodeGeneratorBase = (function () {
        function CodeGeneratorBase() {
            this.m_IsConsumer = false;
            this.m_Definition = null;
            this.m_AnnounceData = null;
            this.m_IntrospectionData = null;
            this.m_IntrospectionXml = null;
            this.m_AppId = null;
            this.m_AppName = "";
            this.m_Deviceid = "";
            this.m_DeviceName = "";
            this.m_Manufacturer = "";
            this.m_ModelNumber = "";
            this.m_IconMimeType = "";
            this.m_IconUrl = "";
            this.m_IconData = null;
            this.m_NodeName = "";
            this.m_InterfaceName = "";
            // required functions
            this.m_ObjectWriters = new Array();
            this.m_ObjectReaders = new Array();
            this.m_IsConsumer = false;
            // make sure all object readers & writers needed by protocol are there
            this.AddWriter("y", "*");
            this.AddWriter("b", "*");
            this.AddWriter("n", "*");
            this.AddWriter("q", "*");
            this.AddWriter("i", "*");
            this.AddWriter("u", "*");
            this.AddWriter("s", "*");
            this.AddWriter("o", "*");
            this.AddWriter("g", "*");
            this.AddWriter("v", "*");
            this.AddWriter("ay", "*");
            this.AddWriter("an", "*");
            this.AddWriter("aq", "*");
            this.AddWriter("ai", "*");
            this.AddWriter("au", "*");
            this.AddReader("y", "*");
            this.AddReader("b", "*");
            this.AddReader("n", "*");
            this.AddReader("q", "*");
            this.AddReader("i", "*");
            this.AddReader("u", "*");
            this.AddReader("s", "*");
            this.AddReader("o", "*");
            this.AddReader("g", "*");
            this.AddReader("v", "*");
            this.AddReader("ay", "*");
            this.AddReader("an", "*");
            this.AddReader("aq", "*");
            this.AddReader("ai", "*");
            this.AddReader("au", "*");
            this.AddWriter("a(oas)", "");
            this.AddReader("as", "");
        }
        CodeGeneratorBase.prototype.GenerateReaders = function () {
            var o = "";
            var uptodate = false;
            var kv = null;
            while (!uptodate) {
                uptodate = true;
                for (var _i = 0, _a = this.m_ObjectReaders; _i < _a.length; _i++) {
                    kv = _a[_i];
                    if (kv.m_Code == "") {
                        kv.m_Code = this.Generate_DbusObjectReader(kv.m_Signature);
                        uptodate = false;
                        break;
                    }
                }
            }
            this.m_ObjectReaders = this.m_ObjectReaders.sort(function (s1, s2) {
                return (s1.m_Signature.length == s2.m_Signature.length) ? s1.m_Signature.localeCompare(s2.m_Signature) :
                    ((s1.m_Signature.length < s2.m_Signature.length) ? -1 : 1);
            });
            for (var _b = 0, _c = this.m_ObjectReaders; _b < _c.length; _b++) {
                kv = _c[_b];
                if (kv.m_Code != "*")
                    o += kv.m_Code + "\r\n\r\n";
            }
            return o;
        };
        CodeGeneratorBase.prototype.GenerateWriters = function () {
            var o = "";
            var uptodate = false;
            var kv = null;
            while (!uptodate) {
                uptodate = true;
                for (var _i = 0, _a = this.m_ObjectWriters; _i < _a.length; _i++) {
                    kv = _a[_i];
                    if (kv.m_Code == "") {
                        kv.m_Code = this.Generate_DbusObjectWriter(kv.m_Signature);
                        uptodate = false;
                        break;
                    }
                }
            }
            this.m_ObjectWriters = this.m_ObjectWriters.sort(function (s1, s2) {
                return (s1.m_Signature.length == s2.m_Signature.length) ? s1.m_Signature.localeCompare(s2.m_Signature) :
                    ((s1.m_Signature.length < s2.m_Signature.length) ? -1 : 1);
            });
            for (var _b = 0, _c = this.m_ObjectWriters; _b < _c.length; _b++) {
                kv = _c[_b];
                if (kv.m_Code != "*")
                    o += kv.m_Code + "\r\n\r\n";
            }
            return o;
        };
        CodeGeneratorBase.prototype.SetAnnounceData = function (data) {
            this.m_AnnounceData = data;
        };
        CodeGeneratorBase.prototype.SetIntrospectionData = function (data) {
            this.m_IntrospectionData = data;
        };
        CodeGeneratorBase.prototype.SetIntrospectionXml = function (data) {
            this.m_IntrospectionXml = data;
        };
        CodeGeneratorBase.prototype.SetDeviceData = function (app_id, app_name, device_id, device_name, manufacturer, model_number, object_path, interface_name) {
            this.m_AppId = app_id;
            this.m_AppName = app_name;
            this.m_Deviceid = device_id;
            this.m_DeviceName = device_name;
            this.m_Manufacturer = manufacturer;
            this.m_ModelNumber = model_number;
            this.m_NodeName = object_path;
            this.m_InterfaceName = interface_name;
        };
        CodeGeneratorBase.prototype.SetIconData = function (mimeType, url, data) {
            this.m_IconMimeType = mimeType;
            this.m_IconUrl = url;
            this.m_IconData = data;
        };
        CodeGeneratorBase.prototype.Generate_HexNumbers = function (data) {
            var HEX = "0123456789ABCDEF";
            var o = "";
            for (var i = 0; i < data.length; i++) {
                if (i % 16 == 0)
                    o += "\r\n    ";
                o += "0x" + HEX[data[i] >> 4] + HEX[data[i] & 0x0f];
                if (i != data.length - 1)
                    o += ", ";
            }
            return o;
        };
        CodeGeneratorBase.prototype.CreateCallWrapperName = function (m) {
            return ((m.m_InterfaceItemType == InterfaceItemType.Signal) ? "signal" : "method") + this.CreateItemName(m);
        };
        CodeGeneratorBase.prototype.CreateHandlerFunctionName = function (m) {
            return "handle" + this.CreateItemName(m);
        };
        CodeGeneratorBase.prototype.CreateProcessFunctionName = function (m) {
            return "__process" + this.CreateItemName(m);
        };
        CodeGeneratorBase.prototype.CreateReadFunctionName = function (signature) {
            return "body_Read_" + this.DbusTypeToFunctionPostfix(signature);
        };
        CodeGeneratorBase.prototype.CreateWriteFunctionName = function (signature) {
            return "body_Write_" + this.DbusTypeToFunctionPostfix(signature);
        };
        CodeGeneratorBase.prototype.CreateItemName = function (m) {
            var name = "__" + m.m_Name;
            return name.replace(/\./g, '_');
        };
        CodeGeneratorBase.prototype.DbusTypeToFunctionPostfix = function (type) {
            if (null == type)
                return "Void";
            var ret = type.toUpperCase().replace(/\(/g, 'R').replace(/\)/g, '_').replace(/\{/g, 'E').replace(/\}/g, '_');
            var end = ret.length - 1;
            while (ret[end] == '_')
                end--;
            if (end < ret.length - 1)
                ret = ret.substr(0, end + 1);
            return ret;
        };
        CodeGeneratorBase.prototype.SignatureHelper_ValidateSignature = function (signature, single) {
            if ((null == signature) || (0 == signature.length))
                return false;
            var count = 0;
            var idx = 0;
            while (idx < signature.length) {
                var ss = this.SignatureHelper_GetSubSignature(signature, idx);
                if (null == ss)
                    return false;
                idx += ss.length;
                count++;
            }
            if (single && (count > 1))
                return false;
            return true;
        };
        CodeGeneratorBase.prototype.SignatureHelper_GetSubSignature = function (signature, idx) {
            var end = this.SignatureHelper_GetSubSignatureEnd(signature, idx);
            if (end > 0) {
                return signature.substring(idx, end);
            }
            else {
                return null;
            }
        };
        CodeGeneratorBase.prototype.SignatureHelper_GetSubSignatureEnd = function (signature, idx) {
            // check if index is correct in first place
            if ((null == signature) || (idx >= signature.length) || (idx < 0))
                return -1;
            switch (signature[idx]) {
                case 'y':
                case 'n':
                case 'q':
                case 'i':
                case 'u':
                case 's':
                case 'o':
                case 'g':
                case 'x':
                case 't':
                case 'd':
                case 'b':
                case 'v':
                    return idx + 1;
                case '(':
                    idx++;
                    while (idx > 0) {
                        idx = this.SignatureHelper_GetSubSignatureEnd(signature, idx);
                        if (idx > 0) {
                            if (idx >= signature.length) {
                                idx = -1;
                                break;
                            }
                            else if (signature[idx] == ')') {
                                idx++;
                                break;
                            }
                        }
                    }
                    return idx;
                case 'a':
                    return this.SignatureHelper_GetSubSignatureEnd(signature, idx + 1);
                case '{':
                    idx = this.SignatureHelper_GetSubSignatureEnd(signature, idx + 1);
                    if (idx > 0) {
                        idx = this.SignatureHelper_GetSubSignatureEnd(signature, idx);
                        if (idx > 0) {
                            if ((idx >= signature.length) || (signature[idx] != '}')) {
                                idx = -1;
                            }
                            else {
                                idx++;
                            }
                        }
                    }
                    return idx;
                default:
                    return -1;
            }
        };
        CodeGeneratorBase.prototype.AddReader = function (signature, code) {
            for (var _i = 0, _a = this.m_ObjectReaders; _i < _a.length; _i++) {
                var r = _a[_i];
                if (r.m_Signature == signature)
                    return;
            }
            this.m_ObjectReaders.push(new ObjectHandler(signature, code));
        };
        CodeGeneratorBase.prototype.AddWriter = function (signature, code) {
            for (var _i = 0, _a = this.m_ObjectWriters; _i < _a.length; _i++) {
                var w = _a[_i];
                if (w.m_Signature == signature)
                    return;
            }
            this.m_ObjectWriters.push(new ObjectHandler(signature, code));
        };
        return CodeGeneratorBase;
    })();
    var CodeGeneratorTS = (function (_super) {
        __extends(CodeGeneratorTS, _super);
        function CodeGeneratorTS(def) {
            _super.call(this);
            this.m_Definition = def;
        }
        CodeGeneratorTS.prototype.GenerateApplicationCode = function () {
            var o = "";
            o += "\r\n";
            o += "namespace AJ {\r\n";
            o += "    export class Application extends ApplicationBase {\r\n";
            o += this.GenerateInterfaceHandler();
            if (!this.m_IsConsumer) {
                var first = true;
                var val = 0;
                var buffer_idx = 0;
                o += "\r\n";
                o += "        public GetId(): Uint8Array { return new Uint8Array([" + this.Generate_HexNumbers(this.m_AppId) + "]); }\r\n";
                o += "        public GetName(): string { return \"" + this.m_AppName + "\"; }\r\n";
                o += "        public GetDescription(): string { return \"Application Description\"; }\r\n"; // XXX - should come from ui
                o += "        public GetDeviceId(): string { return \"" + this.m_Deviceid + "\"; }\r\n";
                o += "        public GetDeviceName(): string { return \"" + this.m_DeviceName + "\"; }\r\n";
                o += "        public GetManufacturer(): string { return \"" + this.m_Manufacturer + "\"; }\r\n";
                o += "        public GetModelNumber(): string { return \"" + this.m_ModelNumber + "\"; }\r\n";
                o += "        public GetNodeName(): string { return \"" + this.m_NodeName + "\"; }\r\n";
                o += "        public GetInterfaceName(): string { return \"" + this.m_InterfaceName + "\"; }\r\n";
                o += "\r\n";
                var xml = this.m_IntrospectionXml.replace(/\"/g, "\\\"");
                xml = xml.replace(/</g, "\"<");
                xml = xml.replace(/>/g, ">\" + ");
                o += "        public GetIntrospectionXml(): string { return ( \r\n";
                o += xml + " \"\");\r\n";
                o += "\r\n";
                o += "        public GetIconVersion(): number { return 1; }\r\n";
                o += "        public GetIconMimeType(): string { return \"" + this.m_IconMimeType + "\"; }\r\n";
                o += "        public GetIconUrl(): string { return \"" + this.m_IconUrl + "\"; }\r\n";
                o += "        public GetIcon(): Uint8Array { return new Uint8Array([" + this.Generate_HexNumbers(this.m_IconData) + "]); }\r\n";
            }
            // these methods 
            for (var _i = 0, _a = this.m_Definition; _i < _a.length; _i++) {
                var m = _a[_i];
                if (((m.m_InterfaceItemType == InterfaceItemType.Method) && !this.m_IsConsumer) || (m.m_InterfaceItemType == InterfaceItemType.Signal)) {
                    o += "\r\n";
                    o += this.Generate_ProxyMethod(m);
                }
            }
            for (var _b = 0, _c = this.m_Definition; _b < _c.length; _b++) {
                var m = _c[_b];
                if ((m.m_InterfaceItemType == InterfaceItemType.Signal) || ((m.m_InterfaceItemType == InterfaceItemType.Method) && this.m_IsConsumer)) {
                    o += "\r\n";
                    o += this.Generate_SignalMethodWrapper(m);
                }
            }
            for (var _d = 0, _e = this.m_Definition; _d < _e.length; _d++) {
                var m = _e[_d];
                if (((m.m_InterfaceItemType == InterfaceItemType.Method) && !this.m_IsConsumer) || (m.m_InterfaceItemType == InterfaceItemType.Signal)) {
                    o += "\r\n";
                    o += this.Generate_StubMethod(m);
                }
            }
            o += "    };\r\n";
            o += "};\r\n";
            o += "\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.Generate_Data = function (name, data) {
            var o = "";
            o = "var " + name + ": Uint8Array = new Uint8Array([";
            if (null != data) {
                o += this.Generate_HexNumbers(data);
                o += "\r\n]);";
            }
            else {
                o += "0 ]);";
            }
            o += "\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.Generate_ProxyMethod = function (m) {
            var o = "";
            var tstype;
            var default_value;
            var generic_type_name;
            o += "        private " + this.CreateProcessFunctionName(m) + "(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean\r\n";
            o += "        {\r\n";
            o += "            msg.body_StartReading();\r\n";
            // read parameters
            for (var _i = 0, _a = m.m_ParametersIn; _i < _a.length; _i++) {
                var p = _a[_i];
                tstype = this.TypeToTsType(p.m_DataType);
                generic_type_name = this.DbusTypeToFunctionPostfix(p.m_DataType);
                var parameters = "";
                if (generic_type_name == "Object") {
                    parameters = "\"" + p.m_DataType + "\"";
                }
                o += "            var " + p.m_Name + ": " + tstype + " = msg." + this.CreateReadFunctionName(p.m_DataType) + "(" + parameters + ");\r\n";
                this.AddReader(p.m_DataType, "");
            }
            // actual method call
            tstype = this.TypeToTsType((m.m_ParametersReply.length > 0) ? m.m_ParametersReply[0].m_DataType : null);
            generic_type_name = this.DbusTypeToFunctionPostfix((m.m_ParametersReply.length > 0) ? m.m_ParametersReply[0].m_DataType : null);
            if ("void" != tstype) {
                o += "            var ret: " + tstype + " = this." + this.CreateHandlerFunctionName(m) + "(connection";
            }
            else {
                o += "            this." + this.CreateHandlerFunctionName(m) + "(connection";
            }
            for (var _b = 0, _c = m.m_ParametersIn; _b < _c.length; _b++) {
                var p = _c[_b];
                o += ", ";
                o += p.m_Name;
            }
            o += ");\r\n";
            if (m.m_InterfaceItemType == InterfaceItemType.Method) {
                o += "\r\n";
                o += "            msg.CreateReply();\r\n";
                if (m.m_ParametersReply.length > 0) {
                    o += "            msg.m_Reply.hdr_SetSignature(\"" + m.m_ParametersReply[0].m_DataType + "\");\r\n"; // XXX - fix this
                }
                o += "            msg.m_Reply.body_StartWriting();\r\n";
                if (m.m_ParametersReply.length > 0) {
                    o += "            msg.m_Reply." + this.CreateWriteFunctionName(m.m_ParametersReply[0].m_DataType) + "(ret);\r\n"; // XXX - fix this
                    this.AddWriter(m.m_ParametersReply[0].m_DataType, "");
                }
            }
            o += "\r\n";
            o += "            return true;\r\n"; // XXX - fix this
            o += "        }\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.GenerateInterfaceHandler = function () {
            var o = "";
            o += "        public _ProcessMsg(connection: AJ.ConnectorBase, msg: AJ.MsgGeneric): boolean {\r\n";
            o += "            var member: string = msg.hdr_GetMember();\r\n\r\n";
            var first = true;
            for (var _i = 0, _a = this.m_Definition; _i < _a.length; _i++) {
                var m = _a[_i];
                if ((m.m_InterfaceItemType == InterfaceItemType.Signal) || ((m.m_InterfaceItemType == InterfaceItemType.Method) && !this.m_IsConsumer)) {
                    o += "            ";
                    if (!first) {
                        o += "else ";
                    }
                    else {
                        first = false;
                    }
                    o += "if (member == \"" + m.m_Name + "\") {\r\n";
                    o += "                return this." + this.CreateProcessFunctionName(m) + "(connection, msg);\r\n";
                    o += "            }\r\n";
                }
            }
            o += "\r\n";
            o += "            return false;\r\n";
            o += "        }\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.Generate_StubMethod = function (m) {
            var o = "";
            // return type
            o += "        " + this.Generate_StubMethodPrototype(m) + "\r\n";
            o += "        {\r\n";
            if (m.m_ParametersReply.length > 0) {
                var default_value = this.TypeToDefaultTsValue(m.m_ParametersReply[0].m_DataType);
                if (null != default_value) {
                    o += "            return " + default_value + ";\r\n";
                }
            }
            o += "        }\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.Generate_SignalMethodWrapper = function (m) {
            var o = "";
            // return type
            o += "        " + this.Generate_SignalMethodWrapperPrototype(m) + "\r\n";
            o += "        {\r\n";
            if (m.m_InterfaceItemType == InterfaceItemType.Method) {
                o += "            var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);\r\n";
            }
            else {
                o += "            var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);\r\n";
            }
            o += "            msg.hdr_SetInterface(\"" + m.m_Interface + "\");\r\n";
            if (m.m_ObjectPath != "") {
                o += "            msg.hdr_SetObjectPath(\"" + m.m_ObjectPath + "\");\r\n";
            }
            else {
                o += "            msg.hdr_SetObjectPath(\"/" + m.m_Interface.replace(/./g, '/') + "\");\r\n";
                o += "            msg.hdr_SetDestination(\"" + m.m_Interface + "\");\r\n";
            }
            o += "            msg.hdr_SetMember(\"" + m.m_Name + "\");\r\n";
            if (m.m_SignatureIn != "") {
                o += "            msg.hdr_SetSignature(\"" + m.m_SignatureIn + "\");\r\n";
            }
            o += "            if (null != connection.GetLocalNodeId()) msg.hdr_SetSender(connection.GetLocalNodeId());\r\n";
            o += "            msg.body_StartWriting();\r\n";
            for (var _i = 0, _a = m.m_ParametersIn; _i < _a.length; _i++) {
                var p = _a[_i];
                var generic_type_name = this.DbusTypeToFunctionPostfix(p.m_DataType);
                var parameters = "";
                if (generic_type_name == "Object") {
                    parameters = ", " + "\"" + p.m_DataType + "\"";
                }
                o += "            msg." + this.CreateWriteFunctionName(p.m_DataType) + "(" + p.m_Name + parameters + ");\r\n";
                this.AddWriter(p.m_DataType, "");
            }
            if (m.m_InterfaceItemType == InterfaceItemType.Signal) {
                o += "            connection.SendMsg(msg);\r\n";
            }
            else {
                // for method we have to create callback
                o += "            connection.SendMsgWithCallback(msg,\r\n";
                o += "                function() {\r\n";
                o += "                    msg = msg.m_Reply;\r\n";
                o += "                    msg.body_StartReading();\r\n";
                for (var _b = 0, _c = m.m_ParametersReply; _b < _c.length; _b++) {
                    var p = _c[_b];
                    var tstype = this.TypeToTsType(p.m_DataType);
                    var generic_type_name = this.DbusTypeToFunctionPostfix(p.m_DataType);
                    var parameters = "";
                    if (generic_type_name == "Object") {
                        parameters = "\"" + p.m_DataType + "\"";
                    }
                    o += "                    var " + p.m_Name + ": " + tstype + " = msg.body_Read" + generic_type_name + "(" + parameters + ");\r\n";
                }
                // XXX - read return parameters here
                o += "                    if (null != cb) cb(connection";
                for (var pp in m.m_ParametersReply) {
                    o += ", ";
                    o += p.m_Name;
                }
                o += ");\r\n";
                // XXX - here also need to list params
                o += "                }\r\n";
                o += "            );\r\n";
            }
            o += "        }\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.Generate_StubMethodPrototype = function (m) {
            var o = "";
            o += "private ";
            // function name
            o += this.CreateHandlerFunctionName(m) + "(connection";
            // parameters
            for (var _i = 0, _a = m.m_ParametersIn; _i < _a.length; _i++) {
                var p = _a[_i];
                o += ", " + this.CreateParameter(p.m_Name, p.m_DataType);
            }
            o += ")";
            // return type
            var ctype_ret = (m.m_ParametersReply.length > 0) ? this.TypeToTsType(m.m_ParametersReply[0].m_DataType) : "void";
            o += ": " + ctype_ret;
            return o;
        };
        CodeGeneratorTS.prototype.Generate_SignalMethodWrapperPrototype = function (m) {
            var o = "";
            var wrapper_name = this.CreateCallWrapperName(m);
            o += "public ";
            // function name
            o += wrapper_name + "(connection";
            // parameters
            for (var _i = 0, _a = m.m_ParametersIn; _i < _a.length; _i++) {
                var p = _a[_i];
                o += ", " + this.CreateParameter(p.m_Name, p.m_DataType);
            }
            if (m.m_InterfaceItemType == InterfaceItemType.Method) {
                o += ", cb";
            }
            o += ")";
            o += ": void";
            return o;
        };
        CodeGeneratorTS.prototype.CreateParameter = function (name, type) {
            var p = name;
            p += ": " + this.TypeToTsType(type);
            return p;
        };
        CodeGeneratorTS.prototype.Generate_DbusObjectReader = function (signature) {
            var o = "";
            var sp = "        ";
            o += sp + "public " + this.CreateReadFunctionName(signature) + "(): Array<any> {\r\n";
            if (signature[0] == 'a') {
                var ss = this.SignatureHelper_GetSubSignature(signature, 1);
                o += sp + "    var length: number = this.body_Read_I();\r\n";
                if (((ss[0] == '(') || (ss[0] == '{')))
                    o += sp + "    this.Align(8);\r\n";
                o += sp + "    var end: number = this.m_position + length;\r\n";
                o += sp + "    var ret: Array <any> = new Array<any>();\r\n";
                o += sp + "    while (this.m_position < end)\r\n";
                o += sp + "        ret.push(this." + this.CreateReadFunctionName(ss) + "());\r\n";
                o += sp + "    return ret;\r\n";
                this.AddReader(ss, "");
            }
            else if (signature[0] == '(') {
                o += sp + "    var ret: Array <any> = new Array<any>();\r\n";
                o += sp + "    this.Align(8);\r\n";
                var ss = "";
                var idx = 1;
                while (signature[idx + ss.length] != ')') {
                    idx += ss.length;
                    ss = this.SignatureHelper_GetSubSignature(signature, idx);
                    o += sp + "    ret.push(this." + this.CreateReadFunctionName(ss) + "());\r\n";
                    this.AddReader(ss, "");
                }
                o += sp + "    return ret;\r\n";
            }
            else if (signature[0] == '{') {
                o += sp + "    var ret: Array <any> = new Array<any>(2);\r\n";
                o += sp + "    this.Align(8);\r\n";
                var ss = this.SignatureHelper_GetSubSignature(signature, 1);
                o += sp + "    ret[0] = this." + this.CreateReadFunctionName(ss) + "();\r\n";
                this.AddReader(ss, "");
                ss = this.SignatureHelper_GetSubSignature(signature, 1 + ss.length);
                o += sp + "    ret[1] = this." + this.CreateReadFunctionName(ss) + "();\r\n";
                this.AddReader(ss, "");
                o += sp + "    return ret;\r\n";
            }
            else {
                o += sp + "// XXX - needs implementation\r\n";
            }
            o += sp + "};\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.Generate_DbusObjectWriter = function (signature) {
            var o = "";
            var sp = "        ";
            o += sp + "public " + this.CreateWriteFunctionName(signature) + "(v: Array<any>) {\r\n";
            if (signature[0] == 'a') {
                var ss = this.SignatureHelper_GetSubSignature(signature, 1);
                o += sp + "    this.body_Write_A_Start();\r\n";
                o += sp + "    for (var k of v) this." + this.CreateWriteFunctionName(ss) + "(k);\r\n";
                o += sp + "    this.body_Write_A_End(" + (((ss[0] == '(') || (ss[0] == '{')) ? "true" : "false") + ");\r\n";
                this.AddWriter(ss, "");
            }
            else if (signature[0] == '(') {
                o += sp + "    this.Align(8);\r\n";
                var ss = "";
                var par_idx = 0;
                var idx = 1;
                while (signature[idx + ss.length] != ')') {
                    idx += ss.length;
                    ss = this.SignatureHelper_GetSubSignature(signature, idx);
                    o += sp + "    this." + this.CreateWriteFunctionName(ss) + "(v[" + par_idx++ + "]);\r\n";
                    this.AddWriter(ss, "");
                }
            }
            else if (signature[0] == '{') {
                o += sp + "    this.Align(8);\r\n";
                var ss = this.SignatureHelper_GetSubSignature(signature, 1);
                o += sp + "    this." + this.CreateWriteFunctionName(ss) + "(v[0]);\r\n";
                this.AddWriter(ss, "");
                ss = this.SignatureHelper_GetSubSignature(signature, 1 + ss.length);
                o += sp + "    this." + this.CreateWriteFunctionName(ss) + "(v[1]);\r\n";
                this.AddWriter(ss, "");
            }
            else {
                o += sp + "// XXX - needs implementation\r\n";
            }
            o += sp + "};\r\n";
            return o;
        };
        CodeGeneratorTS.prototype.TypeToTsType = function (type) {
            if (null == type)
                return "void";
            else if ("y" == type)
                return "number";
            else if ("b" == type)
                return "boolean";
            else if ("n" == type)
                return "number";
            else if ("q" == type)
                return "number";
            else if ("i" == type)
                return "number";
            else if ("u" == type)
                return "number";
            else if ("s" == type)
                return "string";
            else if ("ay" == type)
                return "Uint8Array";
            else if ("ab" == type)
                return "Array<boolean>";
            else if ("an" == type)
                return "Int16Array";
            else if ("aq" == type)
                return "Uint16Array";
            else if ("ai" == type)
                return "Int32Array";
            else if ("au" == type)
                return "Uint32Array";
            else if ("as" == type)
                return "Array<string>";
            return "any";
        };
        CodeGeneratorTS.prototype.TypeToDefaultTsValue = function (type) {
            if (null == type)
                return null;
            if ("ay" == type)
                return "[1, 2, 3]";
            else if ("ab" == type)
                return "[true, true, false]";
            else if ("an" == type)
                return "[1, 2, 3]";
            else if ("aq" == type)
                return "[1, 2, 3]";
            else if ("ai" == type)
                return "[1, 2, 3]";
            else if ("au" == type)
                return "[1, 2, 3]";
            else if ("as" == type)
                return "[\"aaa\", \"bbb\", \"ccc\"]";
            else if ("s" == type)
                return "\"default-string\"";
            else if ("b" == type)
                return "true";
            return "0";
        };
        return CodeGeneratorTS;
    })(CodeGeneratorBase);
    Generator.CodeGeneratorTS = CodeGeneratorTS;
    Generator.DEFAULT_APP_ID = new Uint8Array([0x12, 0x34]);
    Generator.DEFAULT_APP_NAME = "Test";
    Generator.DEFAULT_APP_DESCRIPTION = "Application Description";
    Generator.DEFAULT_DEVICE_ID = "7019565b8f9a75d05f771fa1baad431c";
    Generator.DEFAULT_DEVICE_NAME = "TestDevice.1234";
    Generator.DEFAULT_MANUFACTURER = "Microsoft";
    Generator.DEFAULT_MODEL_NUMBER = "X1";
    Generator.DEFAULT_APP_INTROSPECTION_XML = "<node name = \"/TestInterface\">" +
        "<interface name=\"org.allmake.TestInterface\">" +
        "<method name=\"TestMethod\">" +
        "<arg type=\"s\" direction=\"in\"/>" +
        "<arg type=\"s\" direction=\"out\"/>" +
        "</method>" +
        "<signal name=\"FirstSignal\">" +
        "<arg type=\"s\" />" +
        "<arg type=\"s\" />" +
        "</signal>" +
        "<signal name=\"SecondSignal\">" +
        "<arg type=\"s\" />" +
        "<arg type=\"s\" />" +
        "<arg type=\"s\" />" +
        "</signal>" +
        "</interface>" +
        "</node>" +
        "";
    Generator.DEFAULT_DEVICE_ICON_VERSION = 1;
    Generator.DEFAULT_DEVICE_ICON_MIME_TYPE = "image/png";
    Generator.DEFAULT_DEVICE_ICON_URL = "";
    Generator.DEFAULT_DEVICE_ICON = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40, 0x08, 0x06, 0x00, 0x00, 0x00, 0xAA, 0x69, 0x71,
        0xDE, 0x00, 0x00, 0x00, 0x01, 0x73, 0x52, 0x47, 0x42, 0x00, 0xAE, 0xCE, 0x1C, 0xE9, 0x00, 0x00,
        0x00, 0x04, 0x67, 0x41, 0x4D, 0x41, 0x00, 0x00, 0xB1, 0x8F, 0x0B, 0xFC, 0x61, 0x05, 0x00, 0x00,
        0x00, 0x09, 0x70, 0x48, 0x59, 0x73, 0x00, 0x00, 0x21, 0x38, 0x00, 0x00, 0x21, 0x38, 0x01, 0x45,
        0x96, 0x31, 0x60, 0x00, 0x00, 0x07, 0x5B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x5E, 0xED, 0x9A, 0x0B,
        0x4C, 0x53, 0x57, 0x18, 0xC7, 0xFF, 0xA5, 0xD0, 0x17, 0x45, 0x41, 0x91, 0x97, 0x45, 0x90, 0x30,
        0x13, 0xDF, 0x99, 0x38, 0x41, 0xF0, 0x11, 0xE7, 0x4C, 0x74, 0x5B, 0xB2, 0x47, 0x82, 0xD9, 0x12,
        0xB3, 0xA9, 0x63, 0xBA, 0x38, 0xE7, 0xE6, 0x62, 0x66, 0x62, 0x66, 0x50, 0xE3, 0x92, 0x3D, 0xE2,
        0x7C, 0xCC, 0xC4, 0x4D, 0x05, 0x67, 0x8C, 0xCB, 0xE6, 0x63, 0x3E, 0xA6, 0x1B, 0xDB, 0xDC, 0xE6,
        0xA6, 0x82, 0xBA, 0x08, 0x09, 0x42, 0x4C, 0x24, 0x80, 0x08, 0x8A, 0x08, 0x94, 0x77, 0x29, 0x85,
        0xB6, 0xFB, 0x3E, 0x7B, 0x1B, 0x90, 0xB6, 0xF4, 0x16, 0x4A, 0x6F, 0x19, 0xFE, 0x92, 0x9B, 0xF6,
        0x9C, 0x9B, 0x3E, 0xBE, 0xFF, 0x3D, 0xE7, 0x7B, 0x9C, 0x73, 0x64, 0xD8, 0x74, 0xC3, 0x8A, 0x61,
        0x4C, 0x80, 0xF0, 0x3A, 0x6C, 0x79, 0x22, 0x80, 0xF0, 0x3A, 0x6C, 0x79, 0x22, 0x80, 0xF0, 0x3A,
        0x6C, 0x71, 0x11, 0x05, 0x2C, 0x40, 0x8D, 0x51, 0x78, 0xEF, 0x63, 0xF8, 0xDF, 0xA8, 0x03, 0x81,
        0x91, 0x0A, 0x5B, 0x7B, 0x90, 0x71, 0x2E, 0x40, 0x8D, 0x01, 0xD6, 0x83, 0x73, 0x84, 0x86, 0xEF,
        0xF9, 0xAB, 0xAC, 0x05, 0xCF, 0xEE, 0x2C, 0x06, 0x46, 0x0C, 0xBE, 0x08, 0xCE, 0xA7, 0x80, 0x4C,
        0xDA, 0xD4, 0xA0, 0xBA, 0xB9, 0x93, 0x1F, 0x8D, 0x4F, 0x70, 0xE1, 0x03, 0x7C, 0xF4, 0xEB, 0xAE,
        0xF0, 0xE1, 0xCF, 0xBB, 0x10, 0x40, 0xDA, 0x11, 0x20, 0x97, 0xF9, 0x4E, 0x01, 0xE7, 0x3E, 0x40,
        0x6F, 0x84, 0x75, 0x5F, 0x2A, 0xAA, 0x5B, 0x3B, 0x45, 0x3F, 0x8C, 0xF6, 0x4E, 0x0B, 0xC6, 0x87,
        0x29, 0x85, 0x56, 0x37, 0x0D, 0x1D, 0x66, 0x18, 0x4C, 0x66, 0xD1, 0x46, 0xA9, 0x83, 0x02, 0x70,
        0xA2, 0x50, 0x8F, 0x8C, 0xA3, 0x65, 0x40, 0x70, 0x90, 0xD0, 0x3B, 0x78, 0xB8, 0x88, 0x02, 0xD4,
        0x55, 0xDB, 0x21, 0xBC, 0x17, 0x01, 0xDB, 0x76, 0x9F, 0x1C, 0xE7, 0x4F, 0xCF, 0xD9, 0xDA, 0x3D,
        0xD8, 0xF0, 0x7D, 0x39, 0x76, 0xFC, 0x5C, 0x05, 0xA8, 0xE4, 0x42, 0x8F, 0x08, 0x94, 0x34, 0x30,
        0x7D, 0xE0, 0x00, 0x19, 0xD7, 0x3E, 0x60, 0x8C, 0xCA, 0xB3, 0x2B, 0x82, 0x2E, 0x27, 0x84, 0x04,
        0x53, 0x48, 0xE3, 0x7B, 0xCE, 0x3E, 0xE3, 0xEA, 0xF2, 0x91, 0xF1, 0x8C, 0x0B, 0x01, 0x3C, 0x84,
        0xC7, 0x90, 0x2B, 0xB7, 0xD1, 0xD7, 0x3D, 0x3F, 0xC0, 0x3B, 0x02, 0x0C, 0x36, 0x16, 0x52, 0x90,
        0x7C, 0x0C, 0xC8, 0x9F, 0xA0, 0xBD, 0x0B, 0x30, 0xD0, 0xC5, 0xAF, 0xED, 0xD4, 0xE6, 0x3E, 0xBE,
        0x67, 0xEE, 0x9F, 0xCA, 0xDE, 0x5B, 0x0F, 0xA8, 0x26, 0x1F, 0x90, 0xED, 0x98, 0x3C, 0x6D, 0x3D,
        0x5B, 0x89, 0x2D, 0x7F, 0x3F, 0xF0, 0xCC, 0x07, 0x30, 0x5D, 0x64, 0x94, 0x91, 0x8C, 0x6C, 0x32,
        0x41, 0x11, 0xA3, 0xC5, 0xC2, 0x38, 0x0D, 0x9E, 0x8E, 0xD4, 0x40, 0xA1, 0x90, 0xC1, 0x1A, 0x44,
        0xDF, 0x65, 0xB6, 0x40, 0xD6, 0x65, 0x85, 0x91, 0x5E, 0x8B, 0xC9, 0x5F, 0x15, 0x3D, 0x6C, 0x47,
        0x79, 0x49, 0x93, 0x2D, 0x8B, 0x0C, 0xA6, 0x29, 0xA4, 0x10, 0xF7, 0x6C, 0xFD, 0x4F, 0x00, 0x36,
        0x9C, 0x1C, 0x6A, 0xEA, 0x33, 0xA3, 0xB1, 0x3A, 0x35, 0x12, 0x6F, 0xCC, 0x0C, 0x17, 0x6E, 0x88,
        0xE3, 0x7A, 0x55, 0x1B, 0xBE, 0xB9, 0x58, 0x8D, 0xEC, 0x82, 0x06, 0x51, 0xBF, 0xE9, 0x5F, 0x53,
        0xA0, 0xD6, 0x80, 0xB4, 0x28, 0x0D, 0x3A, 0x8F, 0xCC, 0xC3, 0x95, 0x75, 0x93, 0x3D, 0x36, 0x9E,
        0x99, 0xA5, 0x0B, 0x46, 0xD6, 0xB2, 0x44, 0xF2, 0x3B, 0x24, 0xA4, 0xD5, 0xFD, 0xB3, 0xF5, 0x1F,
        0x01, 0xE8, 0xC9, 0x5D, 0xFD, 0x68, 0x0A, 0x2E, 0xAF, 0x9F, 0x04, 0x1A, 0xC4, 0x03, 0x87, 0xFD,
        0x86, 0x08, 0xFC, 0x43, 0x00, 0x32, 0xFE, 0xCE, 0xEE, 0x64, 0x24, 0x27, 0x86, 0x0A, 0x1D, 0xCE,
        0xC9, 0xBF, 0xD7, 0x86, 0x73, 0xB7, 0x1A, 0x71, 0xAA, 0xB8, 0x01, 0x17, 0xA9, 0x60, 0x2A, 0xAB,
        0xEF, 0x2B, 0x57, 0x11, 0x97, 0x78, 0x49, 0xEF, 0x03, 0xF4, 0x1D, 0x38, 0x96, 0x91, 0x88, 0xF4,
        0xA4, 0x31, 0x42, 0xC7, 0xE3, 0x64, 0x1C, 0x2D, 0x45, 0xD6, 0xB5, 0x5A, 0xA0, 0x85, 0x0A, 0x24,
        0x15, 0x8D, 0x0D, 0xB9, 0x60, 0x18, 0x0F, 0x6F, 0x72, 0x82, 0xEC, 0x28, 0xE5, 0x31, 0xC1, 0x58,
        0x35, 0x2D, 0x0C, 0x9B, 0x5E, 0xD0, 0x41, 0x27, 0xE4, 0x10, 0xB2, 0x0F, 0xAE, 0x02, 0x1A, 0xCA,
        0x24, 0xDD, 0x64, 0xA0, 0xD2, 0x8E, 0x00, 0x0A, 0x5D, 0xBA, 0x68, 0xB5, 0x53, 0xE3, 0xCF, 0xE4,
        0xD7, 0x41, 0xB6, 0xEC, 0x1F, 0x64, 0x15, 0xE8, 0x01, 0x2D, 0x19, 0x42, 0x46, 0x62, 0x14, 0xA5,
        0xDA, 0xBC, 0x4E, 0xC0, 0x57, 0x28, 0xBD, 0x0F, 0xA7, 0xA4, 0x49, 0xA7, 0x05, 0x05, 0x42, 0xEC,
        0xBB, 0x51, 0x87, 0xD8, 0xF7, 0xAF, 0x21, 0x61, 0x7B, 0xA1, 0xED, 0x0B, 0x14, 0xE2, 0x26, 0x92,
        0xB4, 0x02, 0x50, 0x88, 0x3B, 0xBE, 0x9C, 0x1C, 0x56, 0x2F, 0x4E, 0xE7, 0xD7, 0xE3, 0xE5, 0xDD,
        0xB7, 0x80, 0x78, 0x2D, 0xA5, 0xC5, 0x34, 0x72, 0xDC, 0xD5, 0x11, 0x01, 0x74, 0x5F, 0x49, 0x06,
        0x93, 0x48, 0xE5, 0x5C, 0xBF, 0xAC, 0xBE, 0x02, 0x99, 0xC8, 0x30, 0x28, 0x9D, 0x00, 0x3C, 0xF1,
        0x68, 0x18, 0xA7, 0x8C, 0x23, 0x23, 0x7B, 0xF1, 0xCA, 0xCE, 0x22, 0x20, 0x96, 0x9E, 0x78, 0x7F,
        0x26, 0x27, 0x4F, 0x91, 0x70, 0x35, 0x05, 0x01, 0xFA, 0xB0, 0x88, 0x02, 0x4C, 0x3A, 0x01, 0xCC,
        0x66, 0xA4, 0x4C, 0x72, 0x74, 0x7A, 0x5F, 0xE5, 0x3E, 0x04, 0xC2, 0x68, 0x68, 0xF7, 0xC7, 0xF8,
        0x9E, 0x88, 0xAC, 0x3E, 0x25, 0x14, 0x00, 0x48, 0x8A, 0x22, 0x43, 0x7B, 0x51, 0x4B, 0xA5, 0x38,
        0xA8, 0x24, 0xF6, 0x15, 0xD2, 0x09, 0x40, 0xA8, 0x02, 0x1D, 0x23, 0x83, 0x85, 0xFB, 0x28, 0x87,
        0xF1, 0x15, 0xD2, 0x09, 0x40, 0x8E, 0xAB, 0xB8, 0xDE, 0x20, 0x34, 0xBA, 0x49, 0x9F, 0x1E, 0x06,
        0xB4, 0x7A, 0xB0, 0x16, 0x31, 0x40, 0xA4, 0x13, 0x20, 0x50, 0x86, 0x9C, 0xA2, 0x66, 0xA1, 0xD1,
        0xCD, 0xF4, 0x68, 0x0D, 0x42, 0x79, 0x4D, 0xA0, 0x9F, 0xD5, 0x9D, 0xA7, 0x48, 0x27, 0x00, 0x3B,
        0xA9, 0xB6, 0x2E, 0xD4, 0xB4, 0x52, 0xC5, 0xD7, 0x8B, 0x07, 0xDB, 0x93, 0x80, 0x87, 0x6D, 0x3E,
        0x11, 0x41, 0x52, 0x1F, 0xC0, 0x89, 0xCD, 0xF2, 0x23, 0x25, 0x42, 0xA3, 0x1B, 0x25, 0x4D, 0x0F,
        0xE3, 0x81, 0xB9, 0x08, 0x34, 0x98, 0x6C, 0x75, 0xFF, 0x20, 0x22, 0xAD, 0x00, 0xE4, 0xED, 0x73,
        0xFE, 0xAD, 0xC7, 0xCD, 0xEA, 0x76, 0xA1, 0xA3, 0x1B, 0x25, 0xC5, 0xF3, 0xCE, 0x3D, 0xB3, 0xF1,
        0xEA, 0x74, 0x0A, 0x95, 0x77, 0x5B, 0x29, 0xED, 0xE5, 0x7C, 0xCF, 0xFB, 0x48, 0x2B, 0x00, 0x43,
        0x73, 0x7E, 0xDA, 0xE6, 0x7C, 0x4A, 0xEB, 0x9D, 0x0F, 0xF7, 0x93, 0x6F, 0x4E, 0x40, 0xFB, 0xA1,
        0xB9, 0x58, 0x18, 0x4B, 0x09, 0x53, 0x25, 0x4D, 0x0B, 0x5E, 0xFD, 0xF1, 0x22, 0xD2, 0x0B, 0xC0,
        0x90, 0xD3, 0x0B, 0x5A, 0x9D, 0x8B, 0x7A, 0x17, 0xC3, 0x5D, 0x45, 0x0E, 0xF3, 0xC2, 0xDA, 0x89,
        0x68, 0xCE, 0x4A, 0xC5, 0xA2, 0x71, 0x6A, 0x12, 0x82, 0x47, 0x84, 0x77, 0x84, 0xF0, 0x0F, 0x01,
        0xF8, 0x5F, 0x50, 0xFA, 0x1A, 0xBE, 0x26, 0x17, 0x67, 0x0B, 0xEA, 0x6C, 0x7D, 0x4E, 0x08, 0x09,
        0x92, 0xE3, 0xB7, 0xB5, 0x93, 0xD1, 0x74, 0x30, 0x0D, 0x29, 0x91, 0x14, 0x29, 0xA8, 0x02, 0x85,
        0x65, 0x60, 0x42, 0xF8, 0x87, 0x00, 0x5C, 0xBB, 0xF3, 0x7E, 0x64, 0x8C, 0x16, 0x2F, 0xED, 0x2F,
        0x41, 0xFC, 0xB6, 0x02, 0x34, 0xF1, 0x62, 0xA7, 0x0B, 0x46, 0x28, 0xE4, 0xC8, 0xFB, 0x70, 0x0A,
        0x6E, 0x7F, 0x31, 0x13, 0xA1, 0x72, 0x32, 0xA1, 0xB1, 0xFF, 0x3B, 0xD9, 0x7E, 0x22, 0x00, 0x23,
        0xE4, 0xEE, 0x14, 0x19, 0x2A, 0x0C, 0x16, 0x84, 0x52, 0x45, 0x97, 0xFE, 0xAD, 0x63, 0x84, 0xE8,
        0xC9, 0x53, 0xA3, 0x55, 0x68, 0xD8, 0x3E, 0x03, 0xC7, 0x56, 0x4E, 0x78, 0xB4, 0xA8, 0xD2, 0x9F,
        0xD1, 0xE0, 0x47, 0x02, 0xF4, 0x80, 0x2B, 0xBA, 0xB1, 0x5A, 0x9C, 0x28, 0x6A, 0x82, 0x6C, 0xC5,
        0x25, 0x64, 0x9E, 0xBF, 0x2B, 0xDC, 0x70, 0x4E, 0x7A, 0x52, 0x38, 0xDA, 0xB3, 0x53, 0xA1, 0xE5,
        0x51, 0x63, 0xF2, 0x2C, 0x5A, 0xF8, 0xA7, 0x00, 0x76, 0x78, 0x8B, 0x8C, 0x6A, 0xFC, 0x6D, 0x7F,
        0x3C, 0x80, 0xEC, 0xAD, 0xCB, 0xF8, 0xF8, 0x9C, 0x6B, 0x21, 0x54, 0x72, 0x39, 0x5A, 0xBE, 0x4C,
        0x46, 0xFC, 0x08, 0xFA, 0x0C, 0xEF, 0x17, 0x88, 0xC4, 0xBF, 0x05, 0xB0, 0xC3, 0x6B, 0xFD, 0x51,
        0x1A, 0x7C, 0xC2, 0x42, 0x64, 0x5C, 0xC1, 0xAE, 0x3F, 0xEF, 0x0B, 0x37, 0x1C, 0x29, 0xDF, 0x9C,
        0x84, 0xB8, 0x91, 0x54, 0x50, 0x89, 0x8C, 0x12, 0x43, 0x43, 0x00, 0x3B, 0x1A, 0x12, 0x22, 0x52,
        0x8D, 0xF5, 0x67, 0x2A, 0x21, 0x5B, 0x97, 0x87, 0xAA, 0x66, 0xCA, 0x14, 0x9D, 0x70, 0x27, 0x73,
        0x06, 0xD0, 0x4C, 0x05, 0x95, 0x88, 0x4C, 0x7A, 0x68, 0x09, 0x60, 0x87, 0xD7, 0x08, 0xB5, 0x4A,
        0xC4, 0xAE, 0xC9, 0xC3, 0x81, 0xCB, 0x35, 0x42, 0xE7, 0xE3, 0x9C, 0x7F, 0x77, 0x32, 0x28, 0x94,
        0x08, 0x2D, 0xD7, 0x0C, 0x4D, 0x01, 0x18, 0x0E, 0x1A, 0x71, 0x21, 0x58, 0x95, 0x5D, 0x82, 0x1F,
        0xAE, 0xD7, 0xDA, 0xFA, 0x7A, 0xF0, 0xFC, 0x14, 0x4A, 0xA1, 0x79, 0x0B, 0xCD, 0xCD, 0xFE, 0xC0,
        0xD0, 0x15, 0xC0, 0x4E, 0x8C, 0x06, 0xAF, 0xED, 0x2A, 0x86, 0xC9, 0xC9, 0x94, 0xDF, 0x38, 0x3F,
        0xC2, 0x6D, 0xEA, 0x3C, 0xF4, 0x05, 0xE0, 0x07, 0x4C, 0x21, 0x73, 0xE5, 0x61, 0xC7, 0x9C, 0x61,
        0xE6, 0x84, 0x11, 0xB6, 0xDD, 0xE3, 0x3E, 0x18, 0xFA, 0x02, 0x30, 0x64, 0xC5, 0x55, 0x27, 0x15,
        0x65, 0x7C, 0x28, 0xA5, 0xCB, 0x6E, 0xA2, 0xC1, 0xFF, 0x43, 0x00, 0xF2, 0x07, 0x26, 0x21, 0x91,
        0xEC, 0x49, 0x17, 0x6F, 0x90, 0xBA, 0x31, 0xD1, 0x0F, 0x04, 0x10, 0x11, 0xAB, 0xDC, 0x41, 0x5F,
        0x11, 0xE2, 0xB8, 0xBE, 0x6A, 0x5B, 0x6D, 0x72, 0xB3, 0x41, 0x24, 0xAD, 0x00, 0x2D, 0x14, 0xA6,
        0x3A, 0xC4, 0x25, 0x2C, 0x7D, 0x42, 0x1E, 0x70, 0xE9, 0xD4, 0x51, 0x42, 0xA3, 0x9B, 0xE2, 0x92,
        0x66, 0xDB, 0xCE, 0x52, 0x1F, 0x48, 0x27, 0x80, 0xD1, 0x8C, 0x23, 0xAF, 0x27, 0x62, 0xF9, 0xAC,
        0x70, 0xDB, 0x8A, 0x0F, 0x7B, 0x6B, 0x27, 0xC3, 0xD8, 0x2D, 0x3C, 0x80, 0xF4, 0x46, 0x64, 0x2E,
        0xD1, 0xD9, 0xDA, 0x3D, 0xF8, 0xBA, 0xB0, 0x81, 0x46, 0x80, 0xC4, 0x53, 0x20, 0xC8, 0xBE, 0x9B,
        0xEB, 0x84, 0xD2, 0x7A, 0x23, 0x0E, 0x2D, 0x1D, 0x0F, 0xFD, 0xFE, 0x34, 0x2C, 0x4E, 0x08, 0x06,
        0xCA, 0x5A, 0x6C, 0x6B, 0x80, 0x62, 0xD2, 0x58, 0x5E, 0x41, 0x22, 0x11, 0x71, 0xAF, 0x15, 0x95,
        0x7B, 0x52, 0x84, 0xCE, 0x6E, 0x0C, 0x9D, 0x66, 0x54, 0xF2, 0x91, 0x99, 0x3E, 0x7E, 0x9F, 0xF1,
        0x9E, 0x00, 0x2A, 0x39, 0x7E, 0x2F, 0x6D, 0xC1, 0xA9, 0xA2, 0x06, 0xFC, 0x28, 0x5C, 0x39, 0xB7,
        0x9B, 0x70, 0x4B, 0x4F, 0xC3, 0xDC, 0xCD, 0x9F, 0x08, 0x53, 0xCB, 0xF1, 0xCB, 0x3B, 0x13, 0x61,
        0xFD, 0x6E, 0x3E, 0x3E, 0x5F, 0x32, 0x16, 0x49, 0xD1, 0x6A, 0x5B, 0x79, 0x5B, 0x4F, 0x9E, 0xBD,
        0x89, 0xD2, 0x5D, 0x3E, 0x14, 0x65, 0xBF, 0x38, 0xFD, 0xAD, 0xA1, 0x7B, 0x8D, 0x26, 0xBC, 0x9D,
        0x1C, 0x0E, 0xEB, 0xE1, 0x79, 0xD0, 0x39, 0x39, 0x59, 0x3E, 0xF5, 0xB3, 0x9B, 0x54, 0x3F, 0x90,
        0xA8, 0x6E, 0xF0, 0xDE, 0xF9, 0x00, 0x86, 0xFF, 0x5C, 0xEF, 0x6F, 0x53, 0x91, 0xC6, 0xBC, 0x73,
        0xDB, 0x1B, 0x7A, 0x7A, 0x5B, 0x16, 0x44, 0x21, 0xF3, 0xC5, 0x58, 0xA1, 0xC3, 0x91, 0x72, 0x12,
        0x2F, 0x97, 0xA6, 0x47, 0x69, 0x83, 0x09, 0x66, 0x8A, 0xE7, 0x81, 0x41, 0x01, 0x48, 0x18, 0xAD,
        0xC4, 0x82, 0x84, 0x10, 0xC4, 0xF4, 0x71, 0x96, 0x70, 0xC3, 0xE9, 0x0A, 0xEC, 0xB8, 0x50, 0x2D,
        0xEA, 0xC8, 0xBD, 0x77, 0x05, 0xF0, 0x04, 0x12, 0xE0, 0xD3, 0x45, 0xD1, 0xD8, 0xB8, 0xD8, 0x71,
        0xEE, 0x0E, 0x84, 0xF7, 0x4E, 0x56, 0x60, 0xEF, 0xAF, 0xF7, 0x6C, 0x07, 0x2E, 0x45, 0x20, 0x9D,
        0x13, 0x0C, 0x94, 0xE1, 0x78, 0x71, 0xA3, 0xD0, 0x18, 0x38, 0xAD, 0xE4, 0x44, 0xE3, 0xB6, 0xE6,
        0x63, 0x2F, 0x9F, 0x46, 0x11, 0x69, 0x3C, 0x23, 0xDD, 0x08, 0x60, 0x84, 0x23, 0x71, 0x8B, 0xE7,
        0x44, 0x60, 0xE9, 0xB4, 0x51, 0x58, 0x31, 0x9B, 0x72, 0x77, 0x0F, 0x39, 0x56, 0xA4, 0xC7, 0xA1,
        0x4B, 0x35, 0xC8, 0xC9, 0xA3, 0x82, 0x88, 0x4F, 0x91, 0x3C, 0x8A, 0x7A, 0xE2, 0xC3, 0x89, 0xB4,
        0x02, 0x3C, 0x82, 0x7E, 0x9E, 0x2B, 0x19, 0xBE, 0xF8, 0x1C, 0x10, 0x39, 0xC4, 0x59, 0x94, 0xC3,
        0xA7, 0xE9, 0x82, 0x11, 0xA2, 0x0C, 0x40, 0x4C, 0x84, 0x1A, 0x31, 0xDA, 0x40, 0x8A, 0x74, 0x16,
        0x54, 0x91, 0x4F, 0xB0, 0x76, 0x74, 0xA1, 0xB0, 0xAE, 0x03, 0x17, 0x2B, 0xDA, 0x50, 0xCB, 0x71,
        0x9E, 0x8F, 0xCA, 0xD0, 0x67, 0xFA, 0xBB, 0xA5, 0xEE, 0x07, 0x02, 0xF4, 0x82, 0xC3, 0x1B, 0xEF,
        0x09, 0xF2, 0xC5, 0xA5, 0xAC, 0xFD, 0x3D, 0x3F, 0x54, 0x36, 0x92, 0xF7, 0x14, 0xD9, 0x56, 0x5E,
        0x0D, 0x76, 0x13, 0x5D, 0xC4, 0x20, 0x9D, 0x0F, 0x70, 0x05, 0x1B, 0xC8, 0xC9, 0x0B, 0x67, 0x70,
        0xBC, 0x14, 0xC6, 0x8B, 0x1F, 0xEC, 0xCD, 0xD9, 0xEB, 0x73, 0x9B, 0x4F, 0x9B, 0x29, 0xE8, 0xF2,
        0x82, 0xF1, 0x8C, 0xFF, 0x09, 0xE0, 0x63, 0x9E, 0x08, 0x20, 0xBC, 0x0E, 0x5B, 0x86, 0xB9, 0x00,
        0xC0, 0x7F, 0x1D, 0x0D, 0x74, 0x0F, 0x36, 0x02, 0x82, 0x34, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
})(Generator || (Generator = {}));
//# sourceMappingURL=generator.js.map