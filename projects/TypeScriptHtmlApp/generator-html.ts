namespace Generator
{
    export class CodeGeneratorHTML
    {
        public constructor(def: Array<InterfaceItemDescription>)
        {
            this.m_Definition = def;
        }

        private m_Definition: Array<InterfaceItemDescription> = null;
        private m_Document: Document;
        private m_BodyElement: HTMLDivElement;

        public GenerateForm(root: HTMLDivElement, document: Document): void
        {
            // create body element
            this.m_BodyElement = root;
            this.m_Document = document;

            var hdr: HTMLHeadingElement = this.m_Document.createElement("h2");
            this.m_BodyElement.appendChild(hdr);
            hdr.innerText = this.m_Definition[0].m_Interface;

            var hr: HTMLHRElement = this.m_Document.createElement("hr");
            this.m_BodyElement.appendChild(hr);

            // first create ui to call functions and send signals
            for (var m of this.m_Definition)
            {
                if ((m.m_InterfaceItemType == InterfaceItemType.Signal) || (m.m_InterfaceItemType == InterfaceItemType.Method)) 
                {
                    hdr = this.m_Document.createElement("h3");
                    this.m_BodyElement.appendChild(hdr);
                    hdr.innerText = ((m.m_InterfaceItemType == InterfaceItemType.Signal) ? "SIGNAL: " : "METHOD: ") + m.m_Name;
                    var wrapper_name:string = this.CreateCallWrapperName(m);

                    // XXX - create header
                    // XXX - item type, item name
                    this.CreateFieldsFromSignatureX(m.m_SignatureIn, wrapper_name);

                    // create button
                    var btn: HTMLButtonElement = this.m_Document.createElement("button");
                    this.m_BodyElement.appendChild(btn);
                    btn.innerText = "Send";
                    btn.setAttribute("onclick", "___" + wrapper_name + "()");

                    // create horizontal line
                    hr = this.m_Document.createElement("hr");
                    this.m_BodyElement.appendChild(hr);

                    // XXX - solve this in different way
                    //m_Script += "\r\n" + Generate_SignalMethodWrapper(m) + "\r\n";

                }
            }

            // create "handler" uis
            for (var m of this.m_Definition)
            {
                if (m.m_InterfaceItemType == InterfaceItemType.Signal)
                {
                    hdr = this.m_Document.createElement("h3");
                    this.m_BodyElement.appendChild(hdr);
                    hdr.innerText = ((m.m_InterfaceItemType == InterfaceItemType.Signal) ? "HANDLER (SIGNAL): " : "HANDLER (METHOD): ") + m.m_Name;

                    // create element to receive call parameters
                    var p: HTMLParagraphElement = this.m_Document.createElement("p");
                    p.setAttribute("id", this.CreateHandlerFunctionName(m));
                    this.m_BodyElement.appendChild(p);

                    // XXX  - handle it in different way
                    // and generate handler to override existing handler
                    //m_Script += "\r\n" + Generate_SignalMethodHandler(m) + "\r\n";

                }
            }


            // create paragraph to receive all the logging text
            var le: HTMLParagraphElement = this.m_Document.createElement("p");
            le.setAttribute("id", "MainParagraph");
            this.m_BodyElement.appendChild(le);

            //var se = this.m_Document.createElement("script");
            //m_BodyElement.appendChild(se);
            //se.innerText = "[XXXYYYZZZ]";

        }

        //protected override string Generate_DbusObjectReader(string signature)
        //{
        //    return "";
        //}
        //protected override string Generate_DbusObjectWriter(string signature)
        //{
        //    return "";
        //}

        
        private CreateFieldsFromSignatureX(signature: string, name: string): void
        {
            var container: HTMLTableElement = this.m_Document.createElement("table");
            container.setAttribute("id", name);
            this.m_BodyElement.appendChild(container);

            this.CreateFieldsFromSignature(signature, name, 0);
        }

        private CreateTextField(parentName: string, signature: string, fld_idx: number)
        {
            // XXX - is this correct parent type?
            var parent: HTMLTableElement = this.m_Document.getElementById(parentName) as HTMLTableElement;

            // table row in containing table
            var tr: HTMLTableRowElement = this.m_Document.createElement("tr");

            var sp: HTMLTableElement = this.m_Document.createElement("table");


            //sp.Orientation = Orientation.Horizontal;
            var lbl: HTMLTableDataCellElement = this.m_Document.createElement("td");
            sp.appendChild(lbl);
            //lbl.MinWidth = 50;
            //lbl.VerticalAlignment = VerticalAlignment.Center;
            //lbl.HorizontalAlignment = HorizontalAlignment.Center;
            lbl.innerText = signature;
            //lbl.Margin = new Thickness(5);

            tr.appendChild(sp);
            parent.appendChild(tr);

            var fld_container: HTMLTableDataCellElement = this.m_Document.createElement("td");
            sp.appendChild(fld_container);

            var fld: HTMLElement = null;

            if (signature.length == 1)
            {
                fld = this.m_Document.createElement("textarea");

                if (signature != "s")
                {
                    fld.innerText = (signature == "b") ? "true" : "0";
                }
                else
                {
                    fld.innerText = "...";
                }
            }
            else
            {
                fld = this.m_Document.createElement("table");

                //(fld as StackPanel).Orientation = Orientation.Vertical;
                //(fld as StackPanel).BorderThickness = new Thickness(1);
                //(fld as StackPanel).BorderBrush = new SolidColorBrush(Windows.UI.Colors.Gray);

                if (signature[0] == 'a')
                {
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
        }

        private GetNumberFromField(fld: string): number
        {
            var v: number = 0;

            try
            {
                v = parseFloat(this.GetStringFromField(fld));
            }
            catch (Exception) { };

            return v;
        }


        private GetBooleanFromField(fld: string): boolean
        {
            return this.GetStringFromField(fld) == "true";

        }

        private GetStringFromField(fld: string): string
        {
            var v: string = "";

            try
            {
                v = (this.m_Document.getElementById(fld) as HTMLTextAreaElement).value;
            }
            catch (Exception) { };

            return v;
        }

        private FieldExists(fld: string): boolean
        {
            return this.m_Document.getElementById(fld) != null;
        }

        private CreateFieldsFromSignature(signature: string, prefix: string, fld_idx: number): void
        {
            var idx: number = 0;

            while (idx < signature.length)
            {
                // XXX-SIGNATURE-HELPER
                var subSignature: string = AJ.MsgGeneric.GetSubSignature(signature, idx);

                if (null == subSignature)
                    break;

                this.CreateTextField(prefix, subSignature, fld_idx);

                switch (subSignature[0])
                {
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
        }

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

        private CreateDataFromFields(signature: string): Array<any>
        {
            var fld_idx: number = 0;
            var idx: number = 0;
            var flds: Array<any> = new Array<any>();

            while (idx < signature.length)
            {
                var subSignature: string = AJ.MsgGeneric.GetSubSignature(signature, idx);

                if (null == subSignature)
                    break;

                var fld: any = this.CreateDataFromField(subSignature, "xparamsx", fld_idx++);
                idx += subSignature.length;

                if (null != fld)
                    flds.push(fld);
            }

            return flds;
        }

        private CreateDataFromField(signature: string, prefix: string, fld_idx: number): any
        {
            var v: any = null;

            var subprefix: string = prefix + "-" + fld_idx;

            var subSignature: string = AJ.MsgGeneric.GetSubSignature(signature, 0);

            switch (subSignature[0])
            {
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
                        var flds: Array<any> = new Array<any>();

                        var sub_fld_idx: number = 0;
                        var idx: number = 0;
                        subSignature = subSignature.substr(1, subSignature.length - 2);

                        while (idx < subSignature.length)
                        {
                            var subSubSignature: string = AJ.MsgGeneric.GetSubSignature(subSignature, idx);

                            var fld: any = this.CreateDataFromField(subSubSignature, prefix + "-" + fld_idx, sub_fld_idx++);
                            idx += subSubSignature.length;

                            if (null != fld)
                                flds.push(fld);
                        }

                        v = flds;
                    }
                    break;

                case '{':
                    var kSignature: string = AJ.MsgGeneric.GetSubSignature(subSignature, 1);
                    var vSignature: string = AJ.MsgGeneric.GetSubSignature(subSignature, 1 + kSignature.length);

                    var kv: Array<any> = new Array<any>(2);

                    kv[0] = this.CreateDataFromField(kSignature, prefix + "-" + fld_idx, 0);
                    kv[1] = this.CreateDataFromField(vSignature, prefix + "-" + fld_idx, 1);

                    v = kv;
                    break;

                case 'a':
                    {
                        if (subSignature[1] == '{')
                        {
                            var flds: Array<any> = new Array<any>();
                            var fld: any = null;
                            var sub_fld_idx: number = 0;

                            while (this.FieldExists(prefix + "-" + fld_idx + "-" + sub_fld_idx))
                            {
                                fld = this.CreateDataFromField(AJ.MsgGeneric.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx, sub_fld_idx++);

                                if (null != fld)
                                    flds.push(fld);
                            }
                            v = flds;
                        }
                        else
                        {
                            var flds: Array<any> = new Array<any>();
                            var fld: any = null;
                            var sub_fld_idx: number = 0;

                            while (this.FieldExists(prefix + "-" + fld_idx + "-" + sub_fld_idx))
                            {
                                fld = this.CreateDataFromField(AJ.MsgGeneric.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx, sub_fld_idx++);

                                if (null != fld) flds.push(fld);
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
        }

        private CreateHandlerFunctionName(m: InterfaceItemDescription): string
        {
            return "handle" + this.CreateItemName(m);
        }

        private CreateItemName(m: InterfaceItemDescription): string {
            var name: string = "__" + m.m_Interface + "__" + m.m_Name;
            return name.replace(".", "_");
        }

        private CreateCallWrapperName(m: InterfaceItemDescription): string
        {
            return ((m.m_InterfaceItemType == InterfaceItemType.Signal) ? "signal" : "method") + this.CreateItemName(m);
        }

    }
}
