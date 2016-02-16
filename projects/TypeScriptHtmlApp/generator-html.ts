﻿namespace Generator
{
    export class CodeGeneratorHTML
    {
        public CodeGeneratorHTML(def: Array<InterfaceItemDescription>)
        {
            this.m_Definition = def;
        }

        private m_Definition: Array<InterfaceItemDescription> = null;
        private m_Document: XMLDocument;
        private m_BodyElement: HTMLBodyElement;

        //!public void SetScript(string s)
        //!{
        //!    m_Script = s;
        //!}

        public GenerateForm(): string
        {
            this.m_Document = new XMLDocument();

            // create body element
            this.m_BodyElement = this.m_Document.createElement("body");
            this.m_Document.appendChild(this.m_BodyElement);

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
                    hdr.innerText = ((m.m_InterfaceItemType == InterfaceItemType.Signal) ? "SIGNAL: " : "METHOD: ") + m.Name;
                    var wrapper_name:string = this.CreateCallWrapperName(m);

                    // XXX - create header
                    // XXX - item type, item name
                    this.CreateFieldsFromSignature(m.m_SignatureIn, wrapper_name);

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
                    hdr.innerText = ((m.m_InterfaceItemType == InterfaceItemType.Signal) ? "HANDLER (SIGNAL): " : "HANDLER (METHOD): ") + m.Name;

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
            //se.InnerText = "[XXXYYYZZZ]";


            var xml: string = (new XMLSerializer()).serializeToString(this.m_Document);

            return xml;
        }

        //protected override string Generate_DbusObjectReader(string signature)
        //{
        //    return "";
        //}
        //protected override string Generate_DbusObjectWriter(string signature)
        //{
        //    return "";
        //}

        
        private CreateFieldsFromSignature(signature: string, name: string): void
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
                    btnAdd.InnerText = "+";
                    //btnAdd.Margin = new Thickness(5);
                    //btnAdd.Click += BtnAdd_Click;
                    btns.appendChild(btnAdd);

                    var btnRemove = this.m_Document.createElement("button");
                    btnRemove.InnerText = "-";
                    //btnRemove.Margin = new Thickness(5);
                    //btnRemove.Click += BtnRemove_Click;
                    btns.appendChild(btnRemove);
                    fld.appendChild(btns);
                }
            }

            fld.setAttribute("id", parentName + "-" + fld_idx.ToString());
            //fld.Margin = new Thickness(5);
            //fld.MinWidth = 200;

            fld_container.appendChild(fld);
        }

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

        //private List<object> CreateDataFromFields(string signature)
        //{
        //    int fld_idx = 0;
        //    int idx = 0;
        //    List<object> flds = new List<object>();

        //    while (idx < signature.Length)
        //    {
        //        string subSignature = SignatureHelper.GetSubSignature(signature, idx);

        //        if (null == subSignature)
        //            break;

        //        object fld = CreateDataFromField(subSignature, "xparamsx", fld_idx++);
        //        idx += subSignature.Length;

        //        if (null != fld)
        //            flds.Add(fld);
        //    }

        //    return flds;
        //}

        //private object CreateDataFromField(string signature, string prefix, int fld_idx)
        //{
        //    object v = null;

        //    string subprefix = prefix + "-" + fld_idx.ToString();

        //    string subSignature = SignatureHelper.GetSubSignature(signature, 0);

        //    switch (subSignature[0])
        //    {
        //        case 'y':
        //            v = (byte)GetInt64FromField(subprefix);
        //            break;

        //        case 'n':
        //            v = (Int16)GetInt64FromField(subprefix);
        //            break;
        //        case 'q':
        //            v = (UInt16)GetInt64FromField(subprefix);
        //            break;
        //        case 'i':
        //            v = (Int32)GetInt64FromField(subprefix);
        //            break;
        //        case 'u':
        //            v = (UInt32)GetInt64FromField(subprefix);
        //            break;
        //        case 's':
        //            v = GetStringFromField(subprefix);
        //            break;
        //        case 'o':
        //            v = GetStringFromField(subprefix);
        //            break;
        //        case 'g':
        //            v = GetStringFromField(subprefix);
        //            break;
        //        case 'x':
        //            v = GetInt64FromField(subprefix);
        //            break;
        //        case 't':
        //            v = GetUint64FromField(subprefix);
        //            break;
        //        case 'd':
        //            v = GetDoubleFromField(subprefix);
        //            break;
        //        case 'b':
        //            v = GetBooleanFromField(subprefix);
        //            break;
        //        case '(':
        //            {
        //                List<object> flds = new List<object>();

        //                int sub_fld_idx = 0;
        //                int idx = 0;
        //                subSignature = subSignature.Substring(1, subSignature.Length - 2);

        //                while (idx < subSignature.Length)
        //                {
        //                    string subSubSignature = SignatureHelper.GetSubSignature(subSignature, idx);

        //                    object fld = CreateDataFromField(subSubSignature, prefix + "-" + fld_idx.ToString(), sub_fld_idx++);
        //                    idx += subSubSignature.Length;

        //                    if (null != fld)
        //                        flds.Add(fld);
        //                }

        //                v = flds;
        //            }
        //            break;

        //        case '{':
        //            string kSignature = SignatureHelper.GetSubSignature(subSignature, 1);
        //            string vSignature = SignatureHelper.GetSubSignature(subSignature, 1 + kSignature.Length);

        //            KeyValuePair<object, object> kv = new KeyValuePair<object, object>(
        //                CreateDataFromField(kSignature, prefix + "-" + fld_idx.ToString(), 0),
        //                CreateDataFromField(kSignature, prefix + "-" + fld_idx.ToString(), 1));

        //            v = kv;
        //            break;

        //        case 'a':
        //            {
        //                if (subSignature[1] == '{')
        //                {
        //                    Dictionary<object, object> flds = new Dictionary<object, object>();
        //                    object fld = null;
        //                    int sub_fld_idx = 0;

        //                    while (FieldExists(prefix + "-" + fld_idx.ToString() + "-" + sub_fld_idx))
        //                    {
        //                        fld = CreateDataFromField(SignatureHelper.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx.ToString(), sub_fld_idx++);

        //                        if (null != fld)
        //                            flds.Add(((KeyValuePair<object, object>)fld).Key, ((KeyValuePair<object, object>)fld).Value);
        //                    }
        //                    v = flds;
        //                }
        //                else
        //                {
        //                    List<object> flds = new List<object>();
        //                    object fld = null;
        //                    int sub_fld_idx = 0;

        //                    while (FieldExists(prefix + "-" + fld_idx.ToString() + "-" + sub_fld_idx))
        //                    {
        //                        fld = CreateDataFromField(SignatureHelper.GetSubSignature(subSignature, 1), prefix + "-" + fld_idx.ToString(), sub_fld_idx++);

        //                        if (null != fld) flds.Add(fld);
        //                    }
        //                    v = flds;
        //                }
        //            }
        //            break;

        //        default:
        //            v = null; // XXX - more types
        //            break;
        //    }

        //    return v;
        //}

    }
}
