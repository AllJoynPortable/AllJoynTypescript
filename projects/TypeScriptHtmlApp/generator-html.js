var Generator;
(function (Generator) {
    var CodeGeneratorHTML = (function () {
        function CodeGeneratorHTML(def) {
            this.m_Definition = null;
            this.m_Definition = def;
        }
        CodeGeneratorHTML.prototype.GenerateForm = function (root, document) {
            // create body element
            this.m_BodyElement = root;
            this.m_Document = document;
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
                    hdr.innerText = ((m.m_InterfaceItemType == Generator.InterfaceItemType.Signal) ? "SIGNAL: " : "METHOD: ") + m.m_Name;
                    var wrapper_name = this.CreateCallWrapperName(m);
                    // XXX - create header
                    // XXX - item type, item name
                    this.CreateFieldsFromSignatureX(m.m_SignatureIn, wrapper_name);
                    // create button
                    var btn = this.m_Document.createElement("button");
                    this.m_BodyElement.appendChild(btn);
                    btn.innerText = "Send";
                    btn.setAttribute("onclick", "app.onMethodSignalCall('" + wrapper_name + "', '" + m.m_Name + "');");
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
                    hdr.innerText = ((m.m_InterfaceItemType == Generator.InterfaceItemType.Signal) ? "HANDLER (SIGNAL): " : "HANDLER (METHOD): ") + m.m_Name;
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
            //var se = this.m_Document.createElement("script");
            //m_BodyElement.appendChild(se);
            //se.innerText = "[XXXYYYZZZ]";
        };
        //protected override string Generate_DbusObjectReader(string signature)
        //{
        //    return "";
        //}
        //protected override string Generate_DbusObjectWriter(string signature)
        //{
        //    return "";
        //}
        CodeGeneratorHTML.prototype.CreateFieldsFromSignatureX = function (signature, name) {
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
                    var btns = this.m_Document.createElement("table");
                    btns.setAttribute("id", "btns");
                    //btns.Orientation = Orientation.Horizontal;
                    var btnAdd = this.m_Document.createElement("button");
                    btnAdd.innerText = "+";
                    //btnAdd.Margin = new Thickness(5);
                    //btnAdd.Click += BtnAdd_Click;
                    btns.appendChild(btnAdd);
                    var btnRemove = this.m_Document.createElement("button");
                    btnRemove.innerText = "-";
                    //btnRemove.Margin = new Thickness(5);
                    //btnRemove.Click += BtnRemove_Click;
                    btns.appendChild(btnRemove);
                    fld.appendChild(btns);
                }
            }
            fld.setAttribute("id", parentName + "-" + fld_idx);
            //fld.Margin = new Thickness(5);
            //fld.MinWidth = 200;
            fld_container.appendChild(fld);
        };
        CodeGeneratorHTML.prototype.GetNumberFromField = function (fld) {
            var v = 0;
            try {
                v = parseFloat(this.GetStringFromField(fld));
            }
            catch (Exception) { }
            ;
            return v;
        };
        CodeGeneratorHTML.prototype.GetBooleanFromField = function (fld) {
            return this.GetStringFromField(fld) == "true";
        };
        CodeGeneratorHTML.prototype.GetStringFromField = function (fld) {
            var v = "";
            try {
                var el = this.m_Document.getElementById(fld);
                console.log(el);
                v = el.value;
                console.log(v);
            }
            catch (Exception) { }
            ;
            return v;
        };
        CodeGeneratorHTML.prototype.FieldExists = function (fld) {
            return this.m_Document.getElementById(fld) != null;
        };
        CodeGeneratorHTML.prototype.CreateFieldsFromSignature = function (signature, prefix, fld_idx) {
            var idx = 0;
            while (idx < signature.length) {
                // XXX-SIGNATURE-HELPER
                var subSignature = AJ.MsgGeneric.GetSubSignature(signature, idx);
                if (null == subSignature)
                    break;
                this.CreateTextField(prefix, subSignature, fld_idx);
                switch (subSignature[0]) {
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
                        this.CreateFieldsFromSignature(subSignature.substr(1, subSignature.length - 2), prefix + "-" + fld_idx, 0);
                        idx += subSignature.length;
                        fld_idx++;
                        break;
                    case 'a':
                        this.CreateFieldsFromSignature(AJ.MsgGeneric.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx, 0);
                        idx += subSignature.length;
                        fld_idx++;
                        break;
                    default:
                        // XXX - other things not implemented
                        idx++;
                        break;
                }
            }
        };
        //private void BtnRemove_Click(object sender, RoutedEventArgs e)
        //{
        //    // first stack panel containing the list
        //    StackPanel listContainer = (sender as Button).Parent as StackPanel;
        //    listContainer = listContainer.Parent as StackPanel;
        //    int count = VisualTreeHelper.GetChildrenCount(listContainer);
        //    if (count > 1)
        //    {
        //        listContainer.Children.RemoveAt(count - 1);
        //    }
        //}
        //private void BtnAdd_Click(object sender, RoutedEventArgs e)
        //{
        //    // first stack panel containing the list
        //    StackPanel listContainer = (sender as Button).Parent as StackPanel;
        //    listContainer = listContainer.Parent as StackPanel;
        //    StackPanel mainContainer = listContainer.Parent as StackPanel;
        //    string prefix = listContainer.Name;
        //    string signature = (VisualTreeHelper.GetChild(mainContainer, 0) as TextBlock).Text;
        //    int cnt = 0;
        //    // count number of fields
        //    foreach (UIElement u in listContainer.Children)
        //    {
        //        StackPanel sp = u as StackPanel;
        //        if (sp.Name != "btns")
        //        {
        //            cnt++;
        //        }
        //    }
        //    signature = SignatureHelper.GetSubSignature(signature, 1);
        //    CreateFieldsFromSignature(signature, prefix, cnt);
        //}
        CodeGeneratorHTML.prototype.CreateDataFromFields = function (document, prefix, signature) {
            var fld_idx = 0;
            var idx = 0;
            var flds = new Array();
            this.m_Document = document;
            while (idx < signature.length) {
                var subSignature = AJ.MsgGeneric.GetSubSignature(signature, idx);
                if (null == subSignature)
                    break;
                var fld = this.CreateDataFromField(subSignature, prefix, fld_idx++);
                idx += subSignature.length;
                if (null != fld)
                    flds.push(fld);
            }
            return flds;
        };
        CodeGeneratorHTML.prototype.CreateDataFromField = function (signature, prefix, fld_idx) {
            var v = null;
            var subprefix = prefix + "-" + fld_idx;
            var subSignature = AJ.MsgGeneric.GetSubSignature(signature, 0);
            switch (subSignature[0]) {
                case 'y':
                case 'n':
                case 'q':
                case 'i':
                case 'u':
                    v = this.GetNumberFromField(subprefix);
                    break;
                case 's':
                    v = this.GetStringFromField(subprefix);
                    break;
                case 'o':
                    v = this.GetStringFromField(subprefix);
                    break;
                case 'g':
                    v = this.GetStringFromField(subprefix);
                    break;
                case 'x':
                    v = this.GetNumberFromField(subprefix);
                    break;
                case 't':
                    v = this.GetNumberFromField(subprefix);
                    break;
                case 'd':
                    v = this.GetNumberFromField(subprefix);
                    break;
                case 'b':
                    v = this.GetBooleanFromField(subprefix);
                    break;
                case '(':
                    {
                        var flds = new Array();
                        var sub_fld_idx = 0;
                        var idx = 0;
                        subSignature = subSignature.substr(1, subSignature.length - 2);
                        while (idx < subSignature.length) {
                            var subSubSignature = AJ.MsgGeneric.GetSubSignature(subSignature, idx);
                            var fld = this.CreateDataFromField(subSubSignature, prefix + "-" + fld_idx, sub_fld_idx++);
                            idx += subSubSignature.length;
                            if (null != fld)
                                flds.push(fld);
                        }
                        v = flds;
                    }
                    break;
                case '{':
                    var kSignature = AJ.MsgGeneric.GetSubSignature(subSignature, 1);
                    var vSignature = AJ.MsgGeneric.GetSubSignature(subSignature, 1 + kSignature.length);
                    var kv = new Array(2);
                    kv[0] = this.CreateDataFromField(kSignature, prefix + "-" + fld_idx, 0);
                    kv[1] = this.CreateDataFromField(vSignature, prefix + "-" + fld_idx, 1);
                    v = kv;
                    break;
                case 'a':
                    {
                        if (subSignature[1] == '{') {
                            var flds = new Array();
                            var fld = null;
                            var sub_fld_idx = 0;
                            while (this.FieldExists(prefix + "-" + fld_idx + "-" + sub_fld_idx)) {
                                fld = this.CreateDataFromField(AJ.MsgGeneric.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx, sub_fld_idx++);
                                if (null != fld)
                                    flds.push(fld);
                            }
                            v = flds;
                        }
                        else {
                            var flds = new Array();
                            var fld = null;
                            var sub_fld_idx = 0;
                            while (this.FieldExists(prefix + "-" + fld_idx + "-" + sub_fld_idx)) {
                                fld = this.CreateDataFromField(AJ.MsgGeneric.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx, sub_fld_idx++);
                                if (null != fld)
                                    flds.push(fld);
                            }
                            v = flds;
                        }
                    }
                    break;
                default:
                    v = null; // XXX - more types
                    break;
            }
            return v;
        };
        CodeGeneratorHTML.prototype.CreateHandlerFunctionName = function (m) {
            return "handle" + this.CreateItemName(m);
        };
        CodeGeneratorHTML.prototype.CreateItemName = function (m) {
            var name = "__" + m.m_Interface + "__" + m.m_Name;
            return name.replace(".", "_");
        };
        CodeGeneratorHTML.prototype.CreateCallWrapperName = function (m) {
            return ((m.m_InterfaceItemType == Generator.InterfaceItemType.Signal) ? "signal" : "method") + this.CreateItemName(m);
        };
        return CodeGeneratorHTML;
    })();
    Generator.CodeGeneratorHTML = CodeGeneratorHTML;
})(Generator || (Generator = {}));
//# sourceMappingURL=generator-html.js.map