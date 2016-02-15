var Generator;
(function (Generator) {
    var CodeGeneratorHTML = (function () {
        function CodeGeneratorHTML() {
            this.m_Definition = null;
            //UInt64 GetUint64FromField(string fld)
            //{
            //    UInt64 v = 0;
            //    try
            //    {
            //        v = Convert.ToUInt64((FindName(fld) as TextBox).Text);
            //    }
            //    catch (Exception) { };
            //    return v;
            //}
            //Int64 GetInt64FromField(string fld)
            //{
            //    Int64 v = 0;
            //    try
            //    {
            //        v = Convert.ToInt64((FindName(fld) as TextBox).Text);
            //    }
            //    catch (Exception) { };
            //    return v;
            //}
            //Double GetDoubleFromField(string fld)
            //{
            //    Double v = 0;
            //    try
            //    {
            //        v = Convert.ToDouble((FindName(fld) as TextBox).Text);
            //    }
            //    catch (Exception) { };
            //    return v;
            //}
            //bool GetBooleanFromField(string fld)
            //{
            //    bool v = false;
            //    try
            //    {
            //        if ((FindName(fld) as TextBox).Text == "true")
            //            v = true;
            //    }
            //    catch (Exception) { };
            //    return v;
            //}
            //string GetStringFromField(string fld)
            //{
            //    string v = "";
            //    try
            //    {
            //        v = (FindName(fld) as TextBox).Text;
            //    }
            //    catch (Exception) { };
            //    return v;
            //}
            //bool FieldExists(string fld)
            //{
            //    return FindName(fld) != null;
            //}
            this.void = CreateFieldsFromSignature(string, signature, string, prefix, int, fld_idx);
        }
        CodeGeneratorHTML.prototype.CodeGeneratorHTML = function (def) {
            this.m_Definition = def;
        };
        //!public void SetScript(string s)
        //!{
        //!    m_Script = s;
        //!}
        CodeGeneratorHTML.prototype.GenerateForm = function () {
            this.m_Document = new XMLDocument();
            // create body element
            this.m_BodyElement = this.m_Document.createElement("body");
            this.m_Document.appendChild(this.m_BodyElement);
            var hdr = this.m_Document.createElement("h2");
            this.m_BodyElement.appendChild(hdr);
            hdr.innerText = this.m_Definition[0].m_Interface;
            var hr = this.m_Document.createElement("hr");
            this.m_BodyElement.appendChild(hr);
            // first create ui to call functions and send signals
            for (var _i = 0, _a = this.m_Definition; _i < _a.length; _i++) {
                var m = _a[_i];
                if ((m.m_InterfaceItemType == Generator.InterfaceItemType.Signal) || (m.m_InterfaceItemType == Generator.InterfaceItemType.Method)) {
                    hdr = this.m_Document.createElement("h3");
                    this.m_BodyElement.appendChild(hdr);
                    hdr.innerText = ((m.m_InterfaceItemType == Generator.InterfaceItemType.Signal) ? "SIGNAL: " : "METHOD: ") + m.Name;
                    var wrapper_name = this.CreateCallWrapperName(m);
                    // XXX - create header
                    // XXX - item type, item name
                    this.CreateFieldsFromSignature(m.m_SignatureIn, wrapper_name);
                    // create button
                    var btn = this.m_Document.createElement("button");
                    this.m_BodyElement.appendChild(btn);
                    btn.innerText = "Send";
                    btn.setAttribute("onclick", "___" + wrapper_name + "()");
                    // create horizontal line
                    hr = this.m_Document.createElement("hr");
                    this.m_BodyElement.appendChild(hr);
                }
            }
            // create "handler" uis
            for (var _b = 0, _c = this.m_Definition; _b < _c.length; _b++) {
                var m = _c[_b];
                if (m.m_InterfaceItemType == Generator.InterfaceItemType.Signal) {
                    hdr = this.m_Document.createElement("h3");
                    this.m_BodyElement.appendChild(hdr);
                    hdr.innerText = ((m.m_InterfaceItemType == Generator.InterfaceItemType.Signal) ? "HANDLER (SIGNAL): " : "HANDLER (METHOD): ") + m.Name;
                    // create element to receive call parameters
                    var p = this.m_Document.createElement("p");
                    p.setAttribute("id", this.CreateHandlerFunctionName(m));
                    this.m_BodyElement.appendChild(p);
                }
            }
            // create paragraph to receive all the logging text
            var le = this.m_Document.createElement("p");
            le.setAttribute("id", "MainParagraph");
            this.m_BodyElement.appendChild(le);
            //XmlElement se = m_Document.CreateElement("script");
            //m_BodyElement.AppendChild(se);
            //se.InnerText = "[XXXYYYZZZ]";
            var xml = (new XMLSerializer()).serializeToString(this.m_Document);
            return xml;
        };
        //protected override string Generate_DbusObjectReader(string signature)
        //{
        //    return "";
        //}
        //protected override string Generate_DbusObjectWriter(string signature)
        //{
        //    return "";
        //}
        CodeGeneratorHTML.prototype.CreateFieldsFromSignature = function (signature, name) {
            var container = this.m_Document.createElement("table");
            container.setAttribute("id", name);
            this.m_BodyElement.appendChild(container);
            this.CreateFieldsFromSignature(signature, name, 0);
        };
        CodeGeneratorHTML.prototype.CreateTextField = function (parentName, signature, fld_idx) {
            // XXX - is this correct parent type?
            var parent = this.m_Document.getElementById(parentName);
            // table row in containing table
            var tr = this.m_Document.createElement("tr");
            var sp = this.m_Document.createElement("table");
            //sp.Orientation = Orientation.Horizontal;
            var lbl = this.m_Document.createElement("td");
            sp.appendChild(lbl);
            //lbl.MinWidth = 50;
            //lbl.VerticalAlignment = VerticalAlignment.Center;
            //lbl.HorizontalAlignment = HorizontalAlignment.Center;
            lbl.innerText = signature;
            //lbl.Margin = new Thickness(5);
            tr.appendChild(sp);
            parent.appendChild(tr);
            var fld_container = this.m_Document.createElement("td");
            sp.appendChild(fld_container);
            var fld = null;
            if (signature.length == 1) {
                fld = this.m_Document.createElement("textarea");
                if (signature != "s") {
                    fld.innerText = (signature == "b") ? "true" : "0";
                }
                else {
                    fld.innerText = "...";
                }
            }
            else {
                fld = this.m_Document.createElement("table");
                //(fld as StackPanel).Orientation = Orientation.Vertical;
                //(fld as StackPanel).BorderThickness = new Thickness(1);
                //(fld as StackPanel).BorderBrush = new SolidColorBrush(Windows.UI.Colors.Gray);
                if (signature[0] == 'a') {
                    XmlElement;
                    btns = m_Document.CreateElement("table");
                    btns.SetAttribute("id", "btns");
                    //btns.Orientation = Orientation.Horizontal;
                    XmlElement;
                    btnAdd = m_Document.CreateElement("button");
                    btnAdd.InnerText = "+";
                    //btnAdd.Margin = new Thickness(5);
                    //btnAdd.Click += BtnAdd_Click;
                    btns.AppendChild(btnAdd);
                    XmlElement;
                    btnRemove = m_Document.CreateElement("button");
                    btnRemove.InnerText = "-";
                    //btnRemove.Margin = new Thickness(5);
                    //btnRemove.Click += BtnRemove_Click;
                    btns.AppendChild(btnRemove);
                    fld.AppendChild(btns);
                }
            }
            fld.SetAttribute("id", parentName + "-" + fld_idx.ToString());
            //fld.Margin = new Thickness(5);
            //fld.MinWidth = 200;
            fld_container.AppendChild(fld);
        };
        return CodeGeneratorHTML;
    }());
    Generator.CodeGeneratorHTML = CodeGeneratorHTML;
    {
        int;
        idx = 0;
        while (idx < signature.Length) {
            string;
            subSignature = SignatureHelper.GetSubSignature(signature, idx);
            if (null == subSignature)
                break;
            CreateTextField(prefix, subSignature, fld_idx);
            char;
            t = subSignature[0];
            switch (t) {
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
                    idx++;
                    fld_idx++;
                    break;
                case '(':
                case '{':
                    CreateFieldsFromSignature(subSignature.Substring(1, subSignature.Length - 2), prefix + "-" + fld_idx.ToString(), 0);
                    idx += subSignature.Length;
                    fld_idx++;
                    break;
                case 'a':
                    CreateFieldsFromSignature(SignatureHelper.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx.ToString(), 0);
                    idx += subSignature.Length;
                    fld_idx++;
                    break;
                default:
                    // XXX - other things not implemented
                    idx++;
                    break;
            }
        }
    }
    string;
    Generate_SignalMethodWrapper(Generator.InterfaceItemDescription, m);
    {
        string;
        o = "";
        string;
        wrapper_name = CreateCallWrapperName(m);
        o += "function ___" + wrapper_name + "()\r\n";
        o += "{\r\n";
        o += "    " + wrapper_name + "(connection\r\n";
        int;
        idx = 0;
        foreach(Generator.ParamDescription, p in m.ParametersIn);
        {
            o += ",\r\n    GetValueFromElement(\"" + wrapper_name + "-" + idx++ + "\")";
        }
        o += "\r\n    );\r\n";
        o += "}";
        return o;
    }
    string;
    Generate_SignalMethodHandler(Generator.InterfaceItemDescription, m);
    {
        string;
        o = "";
        bool;
        first = true;
        o += "function " + CreateHandlerFunctionName(m) + "(";
        foreach(Generator.ParamDescription, p in m.ParametersIn);
        {
            if (first)
                first = false;
            else
                o += ", ";
            o += p.Name;
        }
        o += ")\r\n";
        o += "{\r\n";
        o += "    var v='';\r\n";
        foreach(Generator.ParamDescription, p in m.ParametersIn);
        {
            o += "v += ' ' + " + p.Name + ";\r\n";
        }
        o += "    document.getElementById('" + CreateHandlerFunctionName(m) + "').innerText = v;\r\n";
        o += "}";
        return o;
    }
    string;
    m_Script = "";
    XmlElement;
    m_BodyElement = null;
})(Generator || (Generator = {}));
//# sourceMappingURL=generator-html.js.map